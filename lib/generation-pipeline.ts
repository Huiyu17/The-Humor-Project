// Shared orchestration for the real server action and deterministic integration tests.
// Database RPCs authenticate the caller and bind every completion to its owner.
type Database = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown; error: { code?: string; message?: string } | null;
  }>;
};
type Plan = { request_id: string; model: string; prompt: string };
type Output = { text: string; inputTokens?: number; outputTokens?: number };
type Result = { generationId: string; content: string; requestId: string; error?: undefined }
  | { error: string; requestId?: string; generationId?: undefined; content?: undefined };

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Plan>;
  return typeof p.request_id === "string" && typeof p.model === "string" && typeof p.prompt === "string";
}
function tokens(value: number | undefined) {
  return Number.isInteger(value) && value! >= 0 && value! <= 2147483647 ? value! : null;
}

export async function runCaptionGeneration(input: {
  database: Database;
  imageId: string; context: string; style: string; basePrompt: string; defaultModel: string;
  generate: (plan: { model: string; prompt: string }) => Promise<Output>;
  validate: (text: string) => string | null;
  describeError: (error: unknown) => string;
}): Promise<Result> {
  const rpc: Database["rpc"] = async (name, args) => {
    try { return await input.database.rpc(name, args); }
    catch { return { data: null, error: { code: "TRANSPORT" } }; }
  };
  const { data, error } = await rpc("humor_begin_generation", {
    p_image_id: input.imageId, p_context: input.context, p_style: input.style,
    p_base_prompt: input.basePrompt, p_default_model: input.defaultModel,
  });
  if (error || !isPlan(data)) {
    // Do not spend an AI call if we cannot first persist its request.
    return { error: error?.code === "PGRST202"
      ? "Caption generation needs a database update. The app owner must apply migration 013_generation_pipeline.sql."
      : "Caption generation could not start. The app owner should check the enabled prompt chain and model settings." };
  }
  const plan = data;
  const started = Date.now();
  let output: Output = { text: "" };
  let failure: string | null = null;
  try {
    output = await input.generate({ model: plan.model, prompt: plan.prompt });
    output.text = output.text.trim();
    failure = input.validate(output.text);
  } catch (error) {
    // Persist the same sanitized error shown in the UI, never provider secrets.
    failure = input.describeError(error);
  }
  if (output.text.length > 20000) failure ??= "The AI returned an unexpectedly long response. Please try again.";
  const args = {
    p_request_id: plan.request_id, p_response: output.text.slice(0, 20000) || null,
    p_error: failure?.slice(0, 2000) ?? null,
    p_latency_ms: Math.min(2147483647, Math.max(0, Date.now() - started)),
    p_input_tokens: tokens(output.inputTokens), p_output_tokens: tokens(output.outputTokens),
  };
  // Completion is atomic and idempotent. Retrying a lost DB response does not
  // call the AI again or create a second draft/response.
  let finished = await rpc("humor_finish_generation", args);
  if (finished.error) finished = await rpc("humor_finish_generation", args);
  if (finished.error) return {
    error: `The generation result could not be saved. Nothing was published. Reference: ${plan.request_id}`,
    requestId: plan.request_id,
  };
  if (failure) return { error: failure, requestId: plan.request_id };
  if (typeof finished.data !== "string") return { error: "The generation finished without a saved preview. Please try again.", requestId: plan.request_id };
  return { generationId: finished.data, content: output.text, requestId: plan.request_id };
}
