import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../lib/generation-error.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
new Function("exports", code)(exports);
const message = exports.generationErrorMessage;
for (const name of ["APIConnectionTimeoutError", "RequestTimeoutError", "TimeoutError"]) {
  assert.match(message({ name }), /45-second.*timed out.*15 seconds/);
}
for (const status of [408, 504]) assert.match(message({ status }), /timed out.*15 seconds/);
assert.match(message({ statusCode: 429 }), /usage limit.*minute/);
for (const status of [401, 403, 404]) assert.match(message({ status }), /app owner/);
assert.match(message({ status: 503 }), /30 seconds/);
assert.match(message({ name: "APIConnectionError" }), /server could not connect/);
assert.doesNotMatch(message({ name: "APIConnectionError" }), /timed out/);
assert.match(message({ name: "AbortError" }), /interrupted/);
assert.match(message({ status: 400 }), /rewording/);
assert.match(message(null), /did not provide a clear reason/);
const secret = "private-prompt-and-api-key";
assert.doesNotMatch(message(new Error(secret)), new RegExp(secret));
assert.doesNotMatch(message(new Error("failed")), /timed out/);
console.log("PASS: 17 error classification and safe-message checks.");
