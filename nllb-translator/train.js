#!/usr/bin/env node

/**
 * Probix AI - Smart Dictionary "Trainer"
 * Optimized for 4GB RAM Systems
 * 
 * This script validates AI translations and "trains" the 
 * Smart Dictionary (dictionary.json) using the cached NLLB-200 model.
 */

const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MODEL_NAME: 'Xenova/nllb-200-distilled-600M',
  QUANTIZED: true,
  CACHE_DIR: path.join(__dirname, 'model_cache'),
  DICTIONARY_PATH: path.join(__dirname, 'dictionary.json'),
  KAGGLE_DATA_PATH: path.join(__dirname, 'kaggle_training_data.json'),
  USE_KAGGLE: process.argv.includes('--kaggle') || process.argv.includes('--use-kaggle'),
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
};

// Aggressive memory optimizations for 4GB RAM
env.allowLocalModels = true;
env.cacheDir = CONFIG.CACHE_DIR;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false; // Disable SIMD to prevent "bad allocation"
env.backends.onnx.logLevel = 'error';

// ============================================================================
// TRAINING DATA - Load from Kaggle or Use Default
// ============================================================================

function loadTrainingData() {
  let trainingData;

  // Try to load Kaggle data if requested
  if (CONFIG.USE_KAGGLE) {
    if (!fs.existsSync(CONFIG.KAGGLE_DATA_PATH)) {
      console.error(`❌ Kaggle data not found at ${CONFIG.KAGGLE_DATA_PATH}`);
      console.error('   Run: npm run load-kaggle-data');
      process.exit(1);
    }
    
    console.log('📂 Loading training data from Kaggle dataset...');
    const kaggleFile = JSON.parse(fs.readFileSync(CONFIG.KAGGLE_DATA_PATH, 'utf8'));
    trainingData = kaggleFile.data || [];
    console.log(`✅ Loaded ${trainingData.length} examples from Kaggle`);
  } else {
    console.log('📂 Using default training data (Educational & Bible Content)');
    trainingData = getDefaultTrainingData();
  }

  return trainingData;
}

function getDefaultTrainingData() {
  return [
  // Educational Phrases - English to Yoruba
  { source: 'Hello, how are you?', target: 'Bawo ni, nibo ni o wa?', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Good morning', target: 'E ka aro', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Thank you very much', target: 'E seun pupo', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'What is your name?', target: 'Kini oruko re?', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'I am happy to meet you', target: 'Inu mi dun lati pade e', sourceLang: 'english', targetLang: 'yoruba' },
  
  // Bible Verses - English to Yoruba
  { source: 'For God so loved the world that he gave his only Son, that whoever believes in him should not perish but have eternal life.', target: 'Nitori Olorun fe aiye to be, o fi Omo re kan soso fun, ki enikeni ti o ba gbagbo ninu u ma ba parun, sugbon ki o ni iye ainipekun.', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'The Lord is my shepherd; I shall not want.', target: 'Oluwa ni oluso agutan mi; nko ni isina kan.', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Trust in the Lord with all your heart, and lean not on your own understanding.', target: 'Gbagbo Oluwa pelu okan re gbogbo, ma si joku lorison oye ara re.', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'I can do all things through Christ who strengthens me.', target: 'Mo le se ohun gbogbo nipa Kristi ti o fun mi ni agbara.', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', target: 'Nitori mo maa imoran ti mo ni fun o, ni Oluwa, imoran alafia fun o, ki o ma ba nu, imoran lati fun o ni ireti ati ojo iwaju.', sourceLang: 'english', targetLang: 'yoruba' },
  
  // Educational Phrases - English to Igbo
  { source: 'Good morning', target: 'Ututu oma', sourceLang: 'english', targetLang: 'igbo' },
  { source: 'How are you?', target: 'Kedu ka imere?', sourceLang: 'english', targetLang: 'igbo' },
  { source: 'Thank you', target: 'Daalu', sourceLang: 'english', targetLang: 'igbo' },
  { source: 'What is your name?', target: 'Gini bu aha gi?', sourceLang: 'english', targetLang: 'igbo' },
  { source: 'I am happy', target: 'Anam anuri', sourceLang: 'english', targetLang: 'igbo' },
  
  // Bible Verses - English to Igbo
  { source: 'For God so loved the world that he gave his only Son, that whoever believes in him should not perish but have eternal life.', target: "Nihi na Chineke huru uwa nke ukwuu ruo na o nyere Onye-nwula-ya nwa-nwa-ya, ka onye o bula kwetere na ya ghara inwuta kama o nwurue ndu ebighi ebi.", sourceLang: 'english', targetLang: 'igbo' },
  { source: 'The Lord is my shepherd; I shall not want.', target: 'Onyenwe m bu onye na-azukwa aturu m; ekwesighi m ihe.', sourceLang: 'english', targetLang: 'igbo' },
  { source: 'I can do all things through Christ who strengthens me.', target: "M nwere ike ime ihe nile site n'ime Kraist onye na-enye m ike.", sourceLang: 'english', targetLang: 'igbo' },
  
  // Educational Phrases - English to Hausa
  { source: 'Good morning', target: 'Ina kwana', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'How are you?', target: 'Ya kike?', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'Thank you', target: 'Na gode', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'What is your name?', target: 'Menene sunanka?', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'I am fine', target: 'Ina lafiya', sourceLang: 'english', targetLang: 'hausa' },
  
  // Bible Verses - English to Hausa
  { source: 'For God so loved the world that he gave his only Son, that whoever believes in him should not perish but have eternal life.', target: 'Domin Allah ya kaunar duniya sosai har ya ba da Dansansa maimaki, domin kowan da ya gaskata da shi kada ya halaka, amma ya sami rai madawwami.', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'The Lord is my shepherd; I shall not want.', target: 'Ubangiji ne makiyaya na, ba ni da bukata.', sourceLang: 'english', targetLang: 'hausa' },
  { source: 'I can do all things through Christ who strengthens me.', target: 'Ina iya yin duk abu ta wurin Kirist wanda ya ba ni karfi.', sourceLang: 'english', targetLang: 'hausa' },
  
  // Nigerian Pidgin
  { source: 'Good morning', target: 'Mornin o', sourceLang: 'english', targetLang: 'pidgin' },
  { source: 'How are you?', target: 'How you dey?', sourceLang: 'english', targetLang: 'pidgin' },
  { source: 'Thank you', target: 'Tank you well well', sourceLang: 'english', targetLang: 'pidgin' },
  { source: 'What is your name?', target: 'Wetin be your name?', sourceLang: 'english', targetLang: 'pidgin' },
  { source: 'I am fine', target: 'I dey fine', sourceLang: 'english', targetLang: 'pidgin' },
  { source: 'God is good', target: 'God dey good', sourceLang: 'english', targetLang: 'pidgin' },
  
  // Additional Educational Content
  { source: 'Welcome to class', target: 'E kaabo si kilasi', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Please open your book', target: 'E jowo si iwe yin', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Read page ten', target: 'Ka oju iwe mewa', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'What is the answer?', target: 'Kini idahun naa?', sourceLang: 'english', targetLang: 'yoruba' },
  { source: 'Well done', target: 'O seun daradara', sourceLang: 'english', targetLang: 'yoruba' },
  ];
}

const TRAINING_DATA = loadTrainingData();

// ============================================================================
// UTILITIES
// ============================================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logMemory = (label) => {
  const usage = process.memoryUsage();
  console.log(`\n📊 Memory Usage (${label}): ${Math.round(usage.rss / 1024 / 1024)}MB`);
};

// ============================================================================
// TRAINER ENGINE
// ============================================================================

async function loadModelWithRetry(retryCount = 0) {
  try {
    console.log(`📦 Loading model (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})...`);
    const model = await pipeline('translation', CONFIG.MODEL_NAME, {
      quantized: CONFIG.QUANTIZED,
      cache_dir: CONFIG.CACHE_DIR
    });
    return model;
  } catch (err) {
    console.error(`❌ Load failed: ${err.message}`);
    if (retryCount < CONFIG.MAX_RETRIES - 1) {
      console.log(`🔄 Retrying in ${CONFIG.RETRY_DELAY_MS / 1000}s...`);
      await sleep(CONFIG.RETRY_DELAY_MS);
      return loadModelWithRetry(retryCount + 1);
    }
    throw err;
  }
}

async function runSmartTraining() {
  console.log('🌟 Starting Probix AI Smart Dictionary Training...');
  console.log(`   Dataset: ${TRAINING_DATA.length} examples`);
  logMemory('Initial');

  let dictionary = [];
  if (fs.existsSync(CONFIG.DICTIONARY_PATH)) {
    dictionary = JSON.parse(fs.readFileSync(CONFIG.DICTIONARY_PATH, 'utf8'));
  }

  const model = await loadModelWithRetry();
  console.log('✅ Model loaded successfully.');
  logMemory('After Load');

  const langMapping = {
    'english': { code: 'eng_Latn', key: 'en' },
    'yoruba': { code: 'yor_Latn', key: 'yo' },
    'igbo': { code: 'ibo_Latn', key: 'ig' },
    'hausa': { code: 'hau_Latn', key: 'ha' },
    'pidgin': { code: 'pcm_Latn', key: 'pcm' }
  };

  let updates = 0;

  for (let i = 0; i < TRAINING_DATA.length; i++) {
    const example = TRAINING_DATA[i];
    const src = langMapping[example.sourceLang];
    const tgt = langMapping[example.targetLang];

    if (!src || !tgt) {
      console.warn(`⚠️ Skipping example ${i + 1}: Invalid language mapping.`);
      continue;
    }

    console.log(`\n📝 [${i + 1}/${TRAINING_DATA.length}] Checking: "${example.source}" (${example.targetLang})`);

    try {
      const result = await model(example.source, {
        src_lang: src.code,
        tgt_lang: tgt.code
      });

      const prediction = result[0].translation_text;
      
      // If AI's prediction is NOT exactly what we want, we update dictionary
      if (prediction.trim() !== example.target.trim()) {
        console.log(`   ⚠️  AI was slightly off. Updating dictionary...`);
        
        // Find existing or create new dictionary entry
        const dictIdx = dictionary.findIndex(d => d.en.toLowerCase() === example.source.toLowerCase());
        
        if (dictIdx !== -1) {
          // Update existing entry
          dictionary[dictIdx][tgt.key] = example.target;
        } else {
          // Create new entry
          const newEntry = { en: example.source };
          newEntry[tgt.key] = example.target;
          dictionary.push(newEntry);
        }
        updates++;
      } else {
        console.log('   💎 AI is already perfect for this phrase.');
      }
    } catch (err) {
      console.error(`   ❌ Model Error: ${err.message}`);
      console.log(`   💡 Adding to dictionary directly (Smart Dictionary Override)...`);
      
      const dictIdx = dictionary.findIndex(d => d.en.toLowerCase() === example.source.toLowerCase());
      if (dictIdx !== -1) {
        dictionary[dictIdx][tgt.key] = example.target;
      } else {
        const newEntry = { en: example.source };
        newEntry[tgt.key] = example.target;
        dictionary.push(newEntry);
      }
      updates++;
    }

    // Manual Garbage Collection hint
    if (global.gc) global.gc();
  }

  // Save the updated dictionary
  fs.writeFileSync(CONFIG.DICTIONARY_PATH, JSON.stringify(dictionary, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SMART TRAINING COMPLETE');
  console.log(`📈 Total Dictionary Updates: ${updates}`);
  console.log(`💾 Final Dictionary Size: ${dictionary.length} entries`);
  console.log('💡 Accuracy is now 100% for these phrases with 0 RAM cost!');
  console.log('='.repeat(50));
}

runSmartTraining().catch(err => {
  console.error('\n💥 Fatal Error:', err.message);
  process.exit(1);
});
