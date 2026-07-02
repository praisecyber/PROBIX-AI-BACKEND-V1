#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const MLR = require('ml-regression-multivariate-linear');

const rawPath = path.join(__dirname, 'data', 'kaggle_training_data.json');
const defaultTarget = 'Post_Semester_GPA';
const defaultModelDir = path.join(__dirname, 'models');

const args = process.argv.slice(2);
const options = {
  target: defaultTarget,
  modelOutput: null,
  summaryOutput: null,
  help: false,
};

args.forEach(arg => {
  if (arg === '--help' || arg === '-h') {
    options.help = true;
    return;
  }
  if (arg.startsWith('--target=')) {
    options.target = arg.split('=')[1];
    return;
  }
  if (arg.startsWith('--output=')) {
    options.modelOutput = arg.split('=')[1];
    return;
  }
  if (arg.startsWith('--summary=')) {
    options.summaryOutput = arg.split('=')[1];
    return;
  }
});

if (options.help) {
  console.log('Usage: node train_predictive.js [--target=FieldName] [--output=path] [--summary=path]');
  console.log('  --target   Target field to predict (default: Post_Semester_GPA)');
  console.log('  --output   Output model JSON path');
  console.log('  --summary  Export training summary JSON path');
  process.exit(0);
}

if (!fs.existsSync(rawPath)) {
  console.error('❌ Missing kaggle_training_data.json — run npm run load-kaggle first in nlp-predictor-pro');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const rows = raw.data || [];
const targetField = options.target;

const numericFields = [
  'Pre_Semester_GPA',
  'Weekly_GenAI_Hours',
  'Traditional_Study_Hours',
  'Perceived_AI_Dependency',
  'Anxiety_Level_During_Exams',
  'Skill_Retention_Score',
  'Tool_Diversity'
];

const categoricalFields = [
  'Major_Category',
  'Year_of_Study',
  'Primary_Use_Case',
  'Prompt_Engineering_Skill',
  'Paid_Subscription',
  'Institutional_Policy',
  'Age_Group',
  'Learning_Style',
  'Tech_Access_Level',
  'Native_Language'
];

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const n = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function buildCategoryMaps(rows) {
  const maps = {};
  categoricalFields.forEach(field => {
    maps[field] = Array.from(new Set(rows.map(r => (r[field] == null ? 'UNKNOWN' : String(r[field]).trim()))));
  });
  return maps;
}

function encodeRow(row) {
  const featureVector = [];
  for (const field of numericFields) {
    featureVector.push(parseNumber(row[field]));
  }
  for (const field of categoricalFields) {
    const value = row[field] == null ? 'UNKNOWN' : String(row[field]).trim();
    const values = categoryMaps[field];
    values.forEach(v => featureVector.push(v === value ? 1 : 0));
  }
  return featureVector;
}

const categoryMaps = buildCategoryMaps(rows);

if (rows.length > 0 && !Object.prototype.hasOwnProperty.call(rows[0], targetField)) {
  console.error(`❌ Target field not found in dataset: ${targetField}`);
  process.exit(1);
}

const cleaned = [];
for (const row of rows) {
  const y = parseNumber(row[targetField]);
  if (Number.isNaN(y)) continue;
  const x = encodeRow(row);
  if (x.some(Number.isNaN)) continue;
  cleaned.push({ x, y });
}

if (cleaned.length === 0) {
  console.error('❌ No valid training rows found after preprocessing.');
  process.exit(1);
}

const X = cleaned.map(r => r.x);
const Y = cleaned.map(r => [r.y]);
const regression = new MLR(X, Y);

const predictions = regression.predict(X);
const mse = predictions.reduce((sum, pred, i) => {
  const error = pred[0] - Y[i][0];
  return sum + error * error;
}, 0) / predictions.length;
const rmse = Math.sqrt(mse);

const labelValues = cleaned.map(r => r.y);
const mean = labelValues.reduce((sum, value) => sum + value, 0) / labelValues.length;
const min = Math.min(...labelValues);
const max = Math.max(...labelValues);

if (!fs.existsSync(defaultModelDir)) {
  fs.mkdirSync(defaultModelDir, { recursive: true });
}

function slugify(value) {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const modelFileName = options.modelOutput || path.join(defaultModelDir, `student_predictive_model_${slugify(targetField)}.json`);
const summaryFileName = options.summaryOutput || path.join(defaultModelDir, `student_predictive_summary_${slugify(targetField)}.json`);
const genericModelFileName = path.join(defaultModelDir, 'student_predictive_model.json');
const genericSummaryFileName = path.join(defaultModelDir, 'student_predictive_summary.json');

const modelOutput = {
  coefficients: regression.weights,
  intercept: regression.intercept,
  targetField,
  numericFields,
  categoricalFields,
  categoryMaps,
  rows: cleaned.length,
  rmse,
  timestamp: new Date().toISOString()
};

const summaryOutput = {
  targetField,
  modelFile: modelFileName,
  rows: cleaned.length,
  rmse,
  mean,
  min,
  max,
  numericFields,
  categoricalFields,
  timestamp: modelOutput.timestamp,
};

fs.writeFileSync(modelFileName, JSON.stringify(modelOutput, null, 2));
fs.writeFileSync(summaryFileName, JSON.stringify(summaryOutput, null, 2));
fs.writeFileSync(genericModelFileName, JSON.stringify(modelOutput, null, 2));
fs.writeFileSync(genericSummaryFileName, JSON.stringify(summaryOutput, null, 2));

console.log('✅ Predictive training complete');
console.log(`📊 Training rows: ${cleaned.length}`);
console.log(`📉 RMSE: ${rmse.toFixed(4)}`);
console.log(`💾 Saved model to ${modelFileName}`);
console.log(`💾 Saved generic model to ${genericModelFileName}`);
console.log(`📝 Saved summary to ${summaryFileName}`);
console.log(`📝 Saved generic summary to ${genericSummaryFileName}`);