// Generates mock pricing rules for all lots so the app is testable visually.
// Usage: node scripts/seed.mjs
// Writes src/data/parking-data.json with synthetic pricing rules.

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "src", "data", "parking-data.json");
const SOURCE_PATH = join(__dirname, "..", "..", "parking-data", "data", "parking-data.json");

function load() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  }
}

function generateRules(lots) {
  const rules = [];
  let ruleId = 0;

  for (const lot of lots) {
    const lat = lot.coordinates.lat;
    // Roughly: closer to downtown (49.28) = more expensive
    const distFromCore = Math.abs(lat - 49.28);
    const baseRate = Math.max(1.5, 6 - distFromCore * 100);

    rules.push({
      id: `seed-rule-${ruleId++}`,
      lotId: lot.id,
      type: "hourly",
      hourlyRate: Math.round(baseRate * 2) / 2, // round to nearest 0.50
      maxDaily: Math.round(baseRate * 2 * 10),
      timeRanges: [
        {
          start: "00:00",
          end: "23:59",
          days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        },
      ],
    });
  }

  return rules;
}

const data = load();
data.rules = generateRules(data.lots);
data.generatedAt = new Date().toISOString();
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
console.log(`Seeded ${data.rules.length} pricing rules for ${data.lots.length} lots → ${DATA_PATH}`);
