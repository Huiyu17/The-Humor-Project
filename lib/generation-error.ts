// Classify SDK metadata only. Never expose provider messages, prompts, or keys.
export function generationErrorMessage(error: unknown): string {
  const details = typeof error === "object" && error !== null
    ? error as { name?: string; status?: number; statusCode?: number } : {};
  const status = details.status ?? details.statusCode;
  if (["APIConnectionTimeoutError", "RequestTimeoutError", "TimeoutError"].includes(details.name ?? "")) {
    return "The AI took longer than our 45-second limit to respond, so this attempt timed out. Wait about 15 seconds, then try again.";
  }
  if (status === 408 || status === 504) {
    return "The AI service timed out before returning a caption. Wait about 15 seconds, then try again.";
  }
  if (status === 429) {
    return "The AI service has reached a request or usage limit. Wait about a minute before trying again. If this continues, please come back later; the app's usage allowance may need to reset.";
  }
  if (status === 401 || status === 403 || status === 404) {
    return "Caption generation is unavailable because the app cannot access its AI service. Your input is not the problem. Please try again later while the app owner checks the service settings.";
  }
  if (status && status >= 500) {
    return "The AI service is temporarily having trouble responding. Wait about 30 seconds, then try again.";
  }
  if (["APIConnectionError", "ConnectionError"].includes(details.name ?? "")) {
    return "Our server could not connect to the AI service. Wait about 15 seconds, then try again. You do not need to upload your photo again.";
  }
  if (["APIUserAbortError", "RequestAbortedError", "AbortError"].includes(details.name ?? "")) {
    return "The generation request was interrupted before it finished. Wait a few seconds, then try again.";
  }
  if (status === 400 || status === 422) {
    return "The AI service could not process this photo and scene. Try rewording the scene or choosing another photo. If this keeps happening, please try again later.";
  }
  return "We couldn't finish this caption, and the service did not provide a clear reason. Wait about 15 seconds, then try again. If it happens again, please come back later.";
}
