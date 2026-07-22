#!/usr/bin/env node

const site = "https://liuhang798.github.io";
const key = "9a7d3f5c8b2146e0a4f9c2d8716b3e45";
const keyLocation = `${site}/${key}.txt`;
const urls = [`${site}/`, `${site}/en/`];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDeployment() {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(keyLocation, { cache: "no-store" });
      if (response.ok && (await response.text()).trim() === key) return;
    } catch {
      // GitHub Pages can take a few seconds to expose the new deployment.
    }
    if (attempt < 6) await wait(5000);
  }
  throw new Error(`IndexNow key is not available at ${keyLocation}`);
}

await waitForDeployment();

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: "liuhang798.github.io",
    key,
    keyLocation,
    urlList: urls,
  }),
});

if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${await response.text()}`);
}

console.log(`IndexNow accepted ${urls.length} URLs with HTTP ${response.status}.`);
