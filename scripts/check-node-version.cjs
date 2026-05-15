#!/usr/bin/env node

const requiredMajor = 20;
const actual = process.versions.node || "";
const actualMajor = Number(actual.split(".")[0]);

if (Number.isNaN(actualMajor)) {
  console.error(`[TripSync] Could not determine Node.js version. Current: "${actual}"`);
  process.exit(1);
}

if (actualMajor !== requiredMajor) {
  console.error(`[TripSync] Unsupported Node.js version: ${actual}`);
  console.error(`[TripSync] This repo requires Node ${requiredMajor}.x (see package.json engines).`);
  console.error(`[TripSync] Switch with nvm: "nvm use ${requiredMajor}" (or install via "nvm install ${requiredMajor}").`);
  process.exit(1);
}
