const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');
const supportedLanguages = require('./languages_full.json').languages;
const { verifyStep } = require('../utils/mathServiceClient');

const CONFIG = {
  MODEL_NAME: 'Xenova/nllb-200-distilled-600M',
  QUANTIZED: true, 
  CACHE_DIR: path.join(__dirname, 'model_cache'),
  DICTIONARY_PATH: path.join(__dirname, 'dictionary.json'),
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  SIMILARITY_THRESHOLD: 0.85, 
};

env.allowLocalModels = true;
env.cacheDir = CONFIG.CACHE_DIR;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false; 
env.backends.onnx.logLevel = 'error';

if (!fs.existsSync(CONFIG.CACHE_DIR)) {
  fs.mkdirSync(CONFIG.CACHE_DIR, { recursive: true });
}

const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB',
  };
};

const logMemory = (label) => {
  const mem = getMemoryUsage();
  console.log(`\n📊 Memory Usage (${label}):`);
  console.table(mem);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateSimilarity = (str1, str2) => {
  const s1 = new Set(str1.toLowerCase().split(/\W+/).filter(x => x.length > 2));
  const s2 = new Set(str2.toLowerCase().split(/\W+/).filter(x => x.length > 2));
  if (s1.size === 0 || s2.size === 0) return 0;
  
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);
  return intersection.size / union.size;
};

const normalizeLangInput = (langInput) => {
  if (!langInput) return null;
  return String(langInput)
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_');
};

const findLanguageEntry = (langInput) => {
  if (!langInput) return null;
  const normalizedInput = normalizeLangInput(langInput).toLowerCase();
  const lowerName = String(langInput).trim().toLowerCase();

  return supportedLanguages.find((entry) => {
    return (
      entry.code.toLowerCase() === normalizedInput ||
      entry.name.toLowerCase() === lowerName
    );
  }) || null;
};

const resolveLanguageCode = (langInput, fallback = null) => {
  if (!langInput) return fallback;
  const entry = findLanguageEntry(langInput);
  if (entry) return entry.code;

  const normalizedInput = normalizeLangInput(langInput);
  if (supportedLanguages.some((entry) => entry.code.toLowerCase() === normalizedInput.toLowerCase())) {
    return supportedLanguages.find((entry) => entry.code.toLowerCase() === normalizedInput.toLowerCase()).code;
  }

  throw new Error(`Unsupported language: ${langInput}. Run with --list-langs to see supported language codes.`);
};

const listSupportedLanguages = () => {
  return supportedLanguages.map((entry) => `${entry.code} — ${entry.name}`);
};

class ProbixTranslator {
  constructor() {
    this.translator = null;
    this.dictionary = [];
    this.tokenizerLangSet = new Set();
    this.loadDictionary();
  }

  loadDictionary() {
    try {
      if (fs.existsSync(CONFIG.DICTIONARY_PATH)) {
        this.dictionary = JSON.parse(fs.readFileSync(CONFIG.DICTIONARY_PATH, 'utf8'));
        console.log(`📖 Smart Dictionary loaded: ${this.dictionary.length} entries`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load dictionary.json. Proceeding without smart features.');
    }
  }

  async loadModel(retryCount = 0) {
    logMemory('Before Loading Model');
    console.log(`\n🚀 Loading model: ${CONFIG.MODEL_NAME}`);
    console.log(`   Quantized: ${CONFIG.QUANTIZED}`);

    try {
      this.translator = await pipeline('translation', CONFIG.MODEL_NAME, {
        quantized: CONFIG.QUANTIZED,
        cache_dir: CONFIG.CACHE_DIR,
      });
      // build a set of language codes accepted by the tokenizer for fallbacks
      try {
        const tk = this.translator.tokenizer || {};
        if (Array.isArray(tk.language_codes)) {
          this.tokenizerLangSet = new Set(tk.language_codes);
        } else {
          const lc = tk.language_codes || tk.lang_to_token || tk.lang2id || {};
          if (Object.keys(lc).length) {
            this.tokenizerLangSet = new Set(Object.keys(lc));
          } else {
            // fallback: try reading tokenizer.json from cache
            const tokPath = path.join(CONFIG.CACHE_DIR, 'Xenova', 'nllb-200-distilled-600M', 'tokenizer.json');
            if (fs.existsSync(tokPath)) {
              const tok = JSON.parse(fs.readFileSync(tokPath, 'utf8'));
              if (Array.isArray(tok.added_tokens)) {
                tok.added_tokens.forEach((t) => {
                  if (t && t.content && typeof t.content === 'string' && t.content.includes('_')) {
                    this.tokenizerLangSet.add(t.content);
                  }
                });
              }
            }
          }
        }
      } catch (e) {
        // non-fatal
      }
      console.log('✅ Model loaded successfully!');
      logMemory('After Loading Model');
      return true;
    } catch (error) {
      console.error(`❌ Error loading model (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}):`, error.message);
      if (retryCount < CONFIG.MAX_RETRIES - 1) {
        const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`🔄 Retrying in ${delay / 1000}s...`);
        await sleep(delay);
        return this.loadModel(retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  findInDictionary(text, targetLangCode) {
    const langMap = { 'yor_Latn': 'yo', 'ibo_Latn': 'ig', 'hau_Latn': 'ha', 'pcm_Latn': 'pcm' };
    const key = langMap[targetLangCode] || targetLangCode;
    let bestMatch = null, maxScore = 0;

    for (const entry of this.dictionary) {
      const score = calculateSimilarity(text, entry.en);
      if (score > maxScore) {
        maxScore = score;
        if (entry[key]) bestMatch = entry[key];
      }
    }

    if (maxScore >= CONFIG.SIMILARITY_THRESHOLD && bestMatch) {
      return { translation: bestMatch, score: maxScore };
    }
    return null;
  }

  getCodeByName(name) {
    try {
      const languages = JSON.parse(fs.readFileSync(path.join(__dirname, 'languages_full.json'), 'utf8')).languages;
      const search = name.toLowerCase().trim();
      const match = languages.find(l => l.name.toLowerCase().includes(search) || l.code.toLowerCase() === search);
      return match ? match.code : null;
    } catch (e) {
      return null;
    }
  }

  // Try to map an input code/name to a tokenizer-accepted code using simple heuristics
  mapToTokenizerCode(langInput) {
    if (!langInput) return null;
    const cand = normalizeLangInput(langInput);
    // exact match
    if (this.tokenizerLangSet.has(cand)) return cand;

    // if input is like 'arb_Latn' but tokenizer only has 'arb_Arab', match on prefix
    const prefix = cand.split('_')[0];
    for (const code of this.tokenizerLangSet) {
      if (code.startsWith(prefix + '_')) return code;
    }

    // try only language part
    if (this.tokenizerLangSet.has(prefix)) return prefix;

    return null;
  }

  async translate(text, sourceLang = 'eng_Latn', targetLang = 'yor_Latn') {
    if (!this.translator) throw new Error('Model not loaded. Call loadModel() first.');

    let resolvedSource;
    try {
      resolvedSource = resolveLanguageCode(sourceLang, 'eng_Latn');
    } catch (e) {
      resolvedSource = this.mapToTokenizerCode(sourceLang) || 'eng_Latn';
    }
    // If we have tokenizer info and the resolved source isn't accepted, try mapping
    if (this.tokenizerLangSet.size && resolvedSource && !this.tokenizerLangSet.has(resolvedSource)) {
      const mappedSrc = this.mapToTokenizerCode(resolvedSource);
      if (mappedSrc) resolvedSource = mappedSrc;
    }

    let resolvedTarget;
    try {
      resolvedTarget = resolveLanguageCode(targetLang);
    } catch (e) {
      // try tokenizer-aware fallback
      resolvedTarget = this.mapToTokenizerCode(targetLang);
    }
    // ensure the final target is accepted by tokenizer, map if necessary
    if (this.tokenizerLangSet.size && resolvedTarget && !this.tokenizerLangSet.has(resolvedTarget)) {
      const mapped = this.mapToTokenizerCode(resolvedTarget);
      if (mapped) resolvedTarget = mapped;
    }
    if (!resolvedTarget) throw new Error('Target language is required. Use --list-langs to choose a supported code.');

    const dictResult = this.findInDictionary(text, resolvedTarget);
    if (dictResult) return dictResult.translation;

    if (this.tokenizerLangSet.size && !this.tokenizerLangSet.has(resolvedTarget)) {
      throw new Error(`Target language code "${targetLang}" (resolved: "${resolvedTarget}") is not supported by the model.`);
    }

    try {
      const output = await this.translator(text, { src_lang: resolvedSource, tgt_lang: resolvedTarget });
      return output[0].translation_text;
    } catch (error) {
      console.error('❌ Translation error:', error.message);
      throw error;
    }
  }

  // Extract simple inline math-like expressions (numbers/operators or LaTeX $...$)
  extractMathExpressions(text) {
    if (!text) return [];
    const results = new Set();
    // Match LaTeX-style $...$
    const latexRe = /\$(.+?)\$/g;
    let m;
    while ((m = latexRe.exec(text)) !== null) {
      results.add(m[1].trim());
    }

    // Match plain math expressions with digits/operators and parentheses
    const plainRe = /[0-9\w]+(?:\s*[+\-*/=^]\s*[0-9\w()]+)+/g;
    while ((m = plainRe.exec(text)) !== null) {
      results.add(m[0].trim());
    }

    return Array.from(results).slice(0, 20); // limit
  }

  // New helper: translate then verify math expressions inside the translation
  async translateAndVerify(text, sourceLang = 'eng_Latn', targetLang = 'yor_Latn') {
    const translation = await this.translate(text, sourceLang, targetLang);
    const mathExprs = this.extractMathExpressions(text).concat(this.extractMathExpressions(translation));
    const checks = [];

    for (let i = 0; i < mathExprs.length; i++) {
      const expr = mathExprs[i];
      try {
        const res = await verifyStep({ step_id: i + 1, expression: expr });
        checks.push({ expression: expr, result: res });
      } catch (e) {
        checks.push({ expression: expr, error: String(e) });
      }
    }

    return { translation, math_checks: checks };
  }

  static listSupportedLanguages() {
    return listSupportedLanguages();
  }
}

module.exports = { ProbixTranslator };