#!/usr/bin/env node

const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MODEL_NAME: 'Xenova/nllb-200-distilled-600M',
  QUANTIZED: true,
  CACHE_DIR: path.join(__dirname, 'model_cache'),
  REQUIRED_DISK_SPACE_GB: 1,
};

// ============================================================================
// SETUP LOGIC
// ============================================================================

async function runSetup() {
  console.log('🛠️  Starting Probix AI Translation Setup...');

  // 1. Check disk space
  console.log('\n🔍 Checking disk space...');
  try {
    const stats = fs.statfsSync(__dirname);
    const freeSpaceGB = (stats.bsize * stats.bfree) / (1024 * 1024 * 1024);
    
    console.log(`   Available space: ${freeSpaceGB.toFixed(2)} GB`);
    if (freeSpaceGB < CONFIG.REQUIRED_DISK_SPACE_GB) {
      console.error(`❌ Error: At least ${CONFIG.REQUIRED_DISK_SPACE_GB}GB of free disk space is required.`);
      process.exit(1);
    }
    console.log('   ✅ Disk space sufficient.');
  } catch (error) {
    console.warn('   ⚠️  Could not verify disk space. Proceeding with caution...');
  }

  // 2. Pre-download the model with progress bar
  console.log(`\n📦 Pre-downloading model: ${CONFIG.MODEL_NAME}`);
  console.log(`   Target Directory: ${CONFIG.CACHE_DIR}`);

  const bars = {};

  try {
    // Configure environment
    env.allowLocalModels = false; // Force download if not in cache
    env.cacheDir = CONFIG.CACHE_DIR;
    env.backends.onnx.logLevel = 'error'; // Suppress noisy ONNX logs during setup

    const translator = await pipeline('translation', CONFIG.MODEL_NAME, {
      quantized: CONFIG.QUANTIZED,
      cache_dir: CONFIG.CACHE_DIR,
      progress_callback: (data) => {
        if (data.status === 'progress') {
          const file = data.file;
          if (!bars[file]) {
            bars[file] = new ProgressBar(`   Downloading ${file} [:bar] :percent :etas`, {
              complete: '=',
              incomplete: ' ',
              width: 20,
              total: 100,
            });
          }
          bars[file].update(data.progress / 100);
        } else if (data.status === 'done') {
          if (bars[data.file]) {
            bars[data.file].update(1);
          }
        }
      },
    });

    console.log('\n✅ Download and loading successful!');

    // 3. Test a simple translation
    console.log('\n📝 Running test translation...');
    const testText = "The setup is complete and working.";
    const result = await translator(testText, {
      src_lang: 'eng_Latn',
      tgt_lang: 'yor_Latn',
    });

    console.log(`   Input: "${testText}"`);
    console.log(`   Output (Yoruba): "${result[0].translation_text}"`);
    console.log('\n🎉 Setup finished successfully! You can now use inference.js');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('💡 Tip: Ensure you have a stable internet connection and try again.');
    process.exit(1);
  }
}

runSetup();
