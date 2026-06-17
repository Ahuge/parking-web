// Fetches the latest parking-data.json from the parking-data GitHub repo.
// Falls back to the local copy if fetch fails (dev workflow).
// Usage: node scripts/fetch-data.mjs

const DATA_REPO = "Ahuge/parking-data";
const BRANCH = "develop";
const DATA_PATH = new URL("../src/data/parking-data.json", import.meta.url);
const LOCAL_FALLBACK = new URL("../../parking-data/data/parking-data.json", import.meta.url);

import { writeFileSync, readFileSync } from "fs";
import { get } from "https";

function download(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function main() {
  const url = `https://raw.githubusercontent.com/${DATA_REPO}/${BRANCH}/data/parking-data.json`;

  try {
    const body = await download(url);
    JSON.parse(body.toString());
    writeFileSync(DATA_PATH, body);
    console.log(`Fetched parking-data.json from ${DATA_REPO} (${body.length} bytes)`);
  } catch {
    try {
      const local = readFileSync(LOCAL_FALLBACK, "utf-8");
      JSON.parse(local);
      writeFileSync(DATA_PATH, local);
      console.log("Using local parking-data.json fallback");
    } catch {
      console.warn("WARNING: Could not fetch parking-data.json. Using existing data if available.");
    }
  }
}

main();
