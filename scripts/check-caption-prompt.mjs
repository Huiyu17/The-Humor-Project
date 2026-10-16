import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../lib/caption-prompt.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
new Function("exports", code)(exports);
const { captionProblem, buildCaptionPrompt, jokeAngles } = exports;
assert.equal(captionProblem("word ".repeat(30).trim(), []), null);
assert.equal(captionProblem("word ".repeat(31).trim(), []), "length");
assert.equal(captionProblem("a".repeat(501), []), "length");
assert.equal(captionProblem("", []), "length");
assert.equal(captionProblem("OFFICIALLY FREE!!!", ["Officially free."]), "duplicate");
assert.equal(captionProblem("Officially free, unofficially exhausted.", ["Officially free."]), null);
const input = { style: "deadpan", scene: "Finals ended", imageDescription: "A cheering person", hasPhoto: false, recentCaptions: [], angle: jokeAngles[0] };
const prompt = buildCaptionPrompt(input);
assert.match(prompt, /No image pixels were provided/);
assert.match(buildCaptionPrompt({ ...input, hasPhoto: true }), /Look at the attached photo/);
assert.notEqual(prompt, buildCaptionPrompt({ ...input, style: "absurd" }));
assert.doesNotMatch(prompt, /living in a dorm|Hartley Hall/);
console.log("PASS: length boundaries, duplicate normalization, visual input, and style prompt checks.");
