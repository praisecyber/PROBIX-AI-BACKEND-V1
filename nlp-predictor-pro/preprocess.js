#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Default input: use the local parsed dataset output
const defaultInput = path.join(__dirname, 'data', 'kaggle_training_data.json');
const defaultOutputDir = path.join(__dirname, 'data');
const defaultOutput = path.join(defaultOutputDir, 'processed_training_data.json');

const input = process.argv[2] || defaultInput;
const output = process.argv[3] || defaultOutput;

if (!fs.existsSync(input)) {
  console.error(`❌ Missing input file — expected ${input}`);
  console.error('   Provide an input path: node preprocess.js <input.json> [output.json]');
  process.exit(1);
}

if (!fs.existsSync(path.dirname(output))) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = raw.data || [];

const numericFields = [
  'Pre_Semester_GPA',
  'Weekly_GenAI_Hours',
  'Traditional_Study_Hours',
  'Post_Semester_GPA',
  'Skill_Retention_Score'
];

const processed = rows.map(r => {
  const out = {};
  Object.keys(r).forEach(k => {
    let v = r[k];
    if (numericFields.includes(k)) {
      const n = parseFloat(v);
      out[k] = isNaN(n) ? null : n;
    } else {
      out[k] = typeof v === 'string' ? v.trim() : v;
    }
  });
  delete out.Student_ID;
  return out;
});

const outputObj = {
  metadata: {
    source: raw.metadata ? raw.metadata.file : 'kaggle_data',
    originalRows: rows.length,
    processedRows: processed.length,
    timestamp: new Date().toISOString()
  },
  data: processed
};

fs.writeFileSync(output, JSON.stringify(outputObj, null, 2));
console.log(`✅ Saved ${processed.length} processed rows to ${output}`);
