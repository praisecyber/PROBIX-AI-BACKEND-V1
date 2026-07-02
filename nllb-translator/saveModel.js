#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dictPath = path.join(__dirname, 'dictionary.json');
const modelsDir = path.join(__dirname, 'models');

if (!fs.existsSync(dictPath)) {
  console.error('❌ dictionary.json not found — run training first');
  process.exit(1);
}

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const outPath = path.join(modelsDir, `dictionary_${Date.now()}.json`);
fs.writeFileSync(outPath, JSON.stringify(dict, null, 2));
console.log(`💾 Saved dictionary snapshot to ${outPath}`);
