import assert from "node:assert/strict";
import { extractResourceCapabilities } from "../lib/resource-capabilities";

const cases = [
  {
    name: "Open-Meteo weather API",
    input: {
      name: "Open-Meteo",
      description: "Open-source weather API with hourly forecasts and historical weather data.",
      tags: ["weather-api", "weather-forecast", "historical-weather"]
    },
    expected: ["weather-forecast-data", "historical-weather"],
    forbidden: ["recipe-data", "stock-market-data"]
  },
  {
    name: "OpenNutriTracker food diary",
    input: {
      name: "OpenNutriTracker",
      description: "A calorie tracker and food diary with barcode scanner and Open Food Facts integration.",
      tags: ["nutrition-tracker", "barcode-food-lookup"]
    },
    expected: ["food-diary", "nutrition-database", "barcode-food-lookup"],
    forbidden: ["recipe-data", "inventory-management"]
  },
  {
    name: "wger workout tracker",
    input: {
      name: "wger",
      description: "Workout routines, workout tracker, nutrition and body weight measurements.",
      tags: ["workout-planning", "workout-tracking", "body-measurements"]
    },
    expected: ["workout-planning", "workout-tracking", "body-measurements"],
    forbidden: ["stock-market-data", "short-video-pipeline"]
  },
  {
    name: "stock inventory is not finance",
    input: {
      name: "Warehouse inventory",
      description: "Inventory stock control and warehouse location management.",
      tags: ["inventory-management"]
    },
    expected: ["inventory-management"],
    forbidden: ["stock-market-data", "technical-analysis"]
  },
  {
    name: "weather UI does not claim weather data",
    input: {
      name: "Weather Icons",
      description: "A static weather icon only component set.",
      tags: ["weather-ui"]
    },
    expected: [],
    forbidden: ["weather-forecast-data", "historical-weather"]
  }
] as const;

for (const benchmark of cases) {
  const matches = extractResourceCapabilities({
    ...benchmark.input,
    tags: [...benchmark.input.tags]
  });
  const capabilityIds = new Set(matches.map((match) => match.capabilityId));
  for (const expected of benchmark.expected) {
    assert(capabilityIds.has(expected), `${benchmark.name} should include ${expected}`);
  }
  for (const forbidden of benchmark.forbidden) {
    assert(!capabilityIds.has(forbidden), `${benchmark.name} should not include ${forbidden}`);
  }
}

console.log(`Resource capability benchmark passed (${cases.length} cases).`);
