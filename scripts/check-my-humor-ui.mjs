// Visual fixture of the real components; no auth/session or hosted data is used.
// npm install --prefix artifacts/my-humor-check --no-save --package-lock=false @electric-sql/pglite playwright
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { chromium } from "../artifacts/my-humor-check/node_modules/playwright/index.mjs";
const runtimeRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const e = React.createElement;
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  const localRequire = (name) => {
    if (name === "next/link") return ({ children, ...props }) => e("a", props, children);
    if (name === "next/navigation") return { useRouter: () => ({ refresh() {}, replace() {} }) };
    if (name === "@/app/actions/my-humor") return {};
    if (name === "./LoginButton" || name === "./LogoutButton") return () => e("button", { className: "nav-link" }, "Sign out");
    if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(file), name + ".tsx")));
    return runtimeRequire(name);
  };
  new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}
const Library = load("components/MyHumorLibrary.tsx").default;
const Header = load("components/SiteHeader.tsx").default;
function photo(width, height, color) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="55%" text-anchor="middle" font-size="70" fill="#fff">:)</text></svg>`)}`;
}
const captions = [
  { id: "one", content: "Me celebrating the end of finals before remembering my laundry has been in the dryer since Tuesday.", created_at: "2026-10-16T10:00:00Z", image: { url: photo(500, 800, "#b4764b"), alt_text: "Portrait fixture" } },
  { id: "two", content: "My face when the syllabus says attendance is optional but participation is 40 percent.", created_at: "2026-10-15T10:00:00Z", image: { url: photo(800, 300, "#6c8067"), alt_text: "Landscape fixture" } },
];
const reset = "*{box-sizing:border-box}button,input{font:inherit}button{border:0}h1,h2,h3{font-size:inherit;font-weight:inherit}body{margin:0}";
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8").replace('@import "tailwindcss";', "");
function html(view, empty = false) {
  return "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><style>" + reset + css + "</style></head><body>" + renderToStaticMarkup(e(React.Fragment, null,
    e(Header, { signedIn: true, active: "my-humor" }),
    e("main", { className: "humor-page" },
      e("div", { className: "page-heading humor-heading" }, e("div", null, e("span", { className: "eyebrow" }, "YOUR PERSONAL COLLECTION"), e("h1", null, "My ", e("span", { className: "serif" }, "humor.")), e("p", { className: "muted" }, "The captions you shared. The ones you keep coming back to.")), e("a", { className: "button button-dark", href: "/create" }, "Create a caption →")),
      e(Library, { view, page: 1, pageSize: 12, captions: empty ? [] : captions, publishedCount: 2, likedCount: empty ? 0 : 2, loadFailed: false })))) + "</body></html>";
}
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const view of ["published", "liked"]) {
        await page.setContent(html(view));
        await page.locator(".caption-image img").first().waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const heights = await page.locator(".caption-image").evaluateAll((els) => els.map(el => el.getBoundingClientRect().height));
        assert.ok(Math.abs(heights[0] - heights[1]) < 1);
        await page.screenshot({ path: `artifacts/my-humor-${view}-${width}.png`, fullPage: true });
      }
    }
    await page.setContent(html("liked", true));
    assert.equal(await page.getByText("Find your kind of funny.").count(), 1);
    await page.screenshot({ path: "artifacts/my-humor-empty-390.png", fullPage: true });
    console.log("PASS: desktop/mobile fixtures, equal image frames, no horizontal overflow, and empty state.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
