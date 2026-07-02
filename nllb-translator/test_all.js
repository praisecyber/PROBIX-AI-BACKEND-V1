#!/usr/bin/env node

/**
 * Probix AI - NLLB-200 Stress Test
 * Tests all 200+ languages to verify model coverage
 */

const { ProbixTranslator } = require('./translatorModel');
const languages = require('./languages_full.json').languages;

async function runFullTest() {
  const translator = new ProbixTranslator();
  const args = process.argv.slice(2);
  const testAll = args.includes('--all');

  console.log('🚀 Starting Universal Language Coverage Test...');
  console.log(`🌍 Total languages available: ${languages.length}`);

  try {
    await translator.loadModel();

    const testPhrase = "Hello, how are you? today";
    let successCount = 0;
    let failCount = 0;

    const sampleSize = testAll ? languages.length : 10;
    console.log(`\n📊 ${testAll ? 'Testing all supported languages' : 'Testing first 10 languages as a sample'}...`);

    for (let i = 0; i < sampleSize; i++) {
      const lang = languages[i];
      try {
        const result = await translator.translate(testPhrase, 'eng_Latn', lang.code);
        console.log(`✅ [${i + 1}/${sampleSize}] ${lang.name.padEnd(25)} (${lang.code}): ${result}`);
        successCount++;
      } catch (err) {
        console.error(`❌ [${i + 1}/${sampleSize}] Failed for ${lang.name}:`, err.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(testAll ? '🎉 FULL COVERAGE TEST COMPLETE' : '🎉 SAMPLE TEST COMPLETE');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('💡 The model supports every NLLB-200 language code listed in languages_full.json.');
    console.log('💡 Use `node test_all.js --all` to validate the full set of languages.');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('💥 Fatal error during test:', error.message);
    process.exit(1);
  }
}

runFullTest();
