import { writeFile } from "node:fs/promises";

let tabs;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    tabs = await fetch("http://127.0.0.1:9222/json").then((r) => r.json());
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
if (!tabs) throw new Error("The local browser debug port did not become ready.");
const tab = tabs.find((entry) => entry.type === "page");
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (!data.id) return;
  const handlers = pending.get(data.id);
  pending.delete(data.id);
  if (data.error) handlers.reject(new Error(data.error.message));
  else handlers.resolve(data.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
await call("Page.enable");
for (const width of [1440, 390]) {
  await call("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 700 });
  await call("Page.navigate", { url: "http://localhost:3000" });
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const metrics = await call("Runtime.evaluate", {
    expression: "JSON.stringify({viewport: innerWidth, content: document.documentElement.scrollWidth, heading: document.querySelector('h1')?.textContent})",
    returnByValue: true,
  });
  console.log(metrics.result.value);
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`artifacts/home-${width}.png`, Buffer.from(screenshot.data, "base64"));
}
await call("Browser.close");
socket.close();
