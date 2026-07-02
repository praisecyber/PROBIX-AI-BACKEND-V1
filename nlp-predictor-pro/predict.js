#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const defaultModelPath = path.join(__dirname, 'models', 'student_predictive_model_Post_Semester_GPA.json');
const args = process.argv.slice(2);
const options = {
  modelPath: defaultModelPath,
  sampleFile: null,
  help: false,
};

const sample = {
  Pre_Semester_GPA: 3.2,
  Weekly_GenAI_Hours: 10,
  Traditional_Study_Hours: 12,
  Perceived_AI_Dependency: 4,
  Anxiety_Level_During_Exams: 3,
  Skill_Retention_Score: 75,
  Tool_Diversity: 2,
  Major_Category: 'Humanities',
  Year_of_Study: 'Senior',
  Primary_Use_Case: 'Copywriting/Drafting',
  Prompt_Engineering_Skill: 'Beginner',
  Paid_Subscription: 'True',
  Institutional_Policy: 'Allowed_With_Citation',
  Age_Group: 'Young_Adult',
  Learning_Style: 'Visual',
  Tech_Access_Level: 'High-Speed Internet',
  Native_Language: 'Yoruba'
};

args.forEach(arg => {
  if (arg === '--help' || arg === '-h') {
    options.help = true;
    return;
  }
  if (arg.startsWith('--model=')) {
    options.modelPath = arg.split('=')[1];
    return;
  }
  if (arg.startsWith('--sample-file=')) {
    options.sampleFile = arg.split('=')[1];
    return;
  }
  const [key, value] = arg.split('=');
  if (!key || value == null) return;
  sample[key] = isNaN(Number(value)) ? value : Number(value);
});

if (options.help) {
  console.log('Usage: node predict.js [--model=path] [--sample-file=path] [Field=Value ...]');
  console.log('  --model        Load a specific trained model JSON');
  console.log('  --sample-file  Load sample input data from JSON file');
  console.log('  Field=Value    Override values in the sample input');
  process.exit(0);
}

if (!fs.existsSync(options.modelPath)) {
  const fallbackPath = path.join(__dirname, 'models', 'student_predictive_model.json');
  if (fs.existsSync(fallbackPath)) {
    options.modelPath = fallbackPath;
  }
}

if (!fs.existsSync(options.modelPath)) {
  console.error(`❌ Model not found at ${options.modelPath}. Run train_predictive.js first.`);
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(options.modelPath, 'utf8'));

if (options.sampleFile) {
  if (!fs.existsSync(options.sampleFile)) {
    console.error(`❌ Sample file not found: ${options.sampleFile}`);
    process.exit(1);
  }
  const fileData = JSON.parse(fs.readFileSync(options.sampleFile, 'utf8'));
  Object.assign(sample, fileData);
}

function encodeSample(sampleData, metadata) {
  const features = [];
  metadata.numericFields.forEach(field => {
    features.push(Number(sampleData[field] ?? 0));
  });
  metadata.categoricalFields.forEach(field => {
    const value = sampleData[field] == null ? 'UNKNOWN' : String(sampleData[field]).trim();
    const values = metadata.categoryMaps[field] || [];
    values.forEach(v => features.push(v === value ? 1 : 0));
  });
  return features;
}

function predict(features, model) {
  const weights = model.coefficients;
  const intercept = model.intercept;
  if (!Array.isArray(weights) || !Array.isArray(weights[0])) {
    throw new Error('Invalid model weights');
  }
  let output = Array.isArray(intercept) ? intercept[0] || 0 : intercept || 0;
  for (let i = 0; i < features.length; i++) {
    output += features[i] * weights[i][0];
  }
  return output;
}

const inputFeatures = encodeSample(sample, metadata);
const prediction = predict(inputFeatures, metadata);

console.log('✅ Prediction complete');
console.log(`🎯 Target field: ${metadata.targetField}`);
console.log(`📦 Loaded model: ${options.modelPath}`);
console.log(`📈 Predicted ${metadata.targetField}: ${prediction.toFixed(4)}`);
console.log('📌 Sample input:', sample);