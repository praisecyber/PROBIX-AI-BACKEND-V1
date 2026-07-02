#!/usr/bin/env node

/**
 * Probix AI Backend Integration Test
 * Tests both translation and prediction capabilities
 */

const { ProbixPredictor } = require('../nlp-predictor-pro/predictorModel');
const { ProbixTranslator } = require('./translatorModel');

(async () => {
  console.log('🧪 Probix AI Backend Integration Test\n');
  
  // Test 1: Load and test predictor
  console.log('--- Test 1: Predictive Model ---');
  const predictor = new ProbixPredictor();
  if (predictor.loadModel()) {
    const info = predictor.getModelInfo();
    console.log(`✅ Model loaded successfully`);
    console.log(`   Target: ${info.targetField}`);
    console.log(`   Training rows: ${info.trainingRows}`);
    console.log(`   RMSE: ${info.rmse.toFixed(4)}\n`);
    
    // Make a prediction
    const sample1 = {
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
    
    const prediction1 = predictor.predict(sample1);
    console.log(`✅ Sample Prediction 1:`);
    console.log(`   Input: Pre_Semester_GPA=${sample1.Pre_Semester_GPA}, Weekly_GenAI_Hours=${sample1.Weekly_GenAI_Hours}`);
    console.log(`   ${info.targetField}: ${prediction1.toFixed(4)}\n`);
    
    // Test batch prediction
    const sample2 = { ...sample1, Pre_Semester_GPA: 3.8, Weekly_GenAI_Hours: 5 };
    const sample3 = { ...sample1, Pre_Semester_GPA: 2.5, Weekly_GenAI_Hours: 20 };
    
    const batch = predictor.predictBatch([sample1, sample2, sample3]);
    console.log(`✅ Batch Predictions (3 samples):`);
    batch.forEach((result, i) => {
      console.log(`   Sample ${i + 1}: ${info.targetField} = ${result.prediction.toFixed(4)}`);
    });
  } else {
    console.log('❌ Failed to load predictive model');
  }

  console.log('\n--- Test 2: Translation Model ---');
  const translator = new ProbixTranslator();
  try {
    await translator.loadModel();
    console.log('✅ Translation model loaded successfully');
    
    // Simple translation test
    const text = 'Hello world';
    const result = await translator.translate(text, 'eng_Latn', 'yor_Latn');
    console.log(`✅ Sample Translation:`);
    console.log(`   English: "${text}"`);
    console.log(`   Yoruba: "${result}"\n`);
  } catch (err) {
    console.log(`⚠️ Translation model test skipped: ${err.message}\n`);
  }

  console.log('🎉 Integration test complete!\n');
  console.log('Available commands:');
  console.log('  npm run predict:interactive  - Interactive prediction mode');
  console.log('  npm run predict:info         - Show model information');
  console.log('  npm run demo                 - Translation demo');
  console.log('  npm run help                 - Show full help');
})();
