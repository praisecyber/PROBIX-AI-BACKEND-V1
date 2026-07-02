/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          PROBIX UNIFIED STT ENGINE v4.0 — SMART AUTO MULTILINGUAL       ║
 * ║                                                                          ║
 * ║  MODES:                                                                  ║
 * ║  smart-auto  ★ Fast English-first with automatic language switching      ║
 * ║               → Run EN (Vosk+Whisper) first (fast)                       ║
 * ║               → If confidence < threshold → switch to multilingual       ║
 * ║               → Detects the right language and re-transcribes            ║
 * ║                                                                          ║
 * ║  en           English only — max speed, Vosk+Whisper parallel            ║
 * ║  auto         Whisper multilingual auto-detect (slower, no EN bias)      ║
 * ║  fr/de/ar/...  Force specific language — Vosk (if installed) + Whisper   ║
 * ║                                                                          ║
 * ║  VOSK PARALLEL FUSION (for non-English languages):                       ║
 * ║   If the language's Vosk model is installed → parallel Vosk+Whisper     ║
 * ║   If not installed → Whisper-only for that language                      ║
 * ║                                                                          ║
 * ║  Download multilingual Vosk models: .\download-vosk-multilang.ps1       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

require('dotenv').config();

const vosk    = require('vosk');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────────────────────────────────────
// Root paths
// ─────────────────────────────────────────────────────────────────────────────
const ROOT     = path.join(__dirname, '..', '..');
const VOSK_DIR = path.join(ROOT, 'vosk-whisper', 'vosk');

// ─────────────────────────────────────────────────────────────────────────────
// Vosk Language Registry
// Maps BCP-47 language code → model folder name inside vosk-whisper/vosk/
// Run .\download-vosk-multilang.ps1 to install any of these.
// ─────────────────────────────────────────────────────────────────────────────
const VOSK_LANG_REGISTRY = {
  en: 'vosk-model-small-en-us-0.15',  // always present
  fr: 'vosk-model-small-fr-0.22',
  de: 'vosk-model-small-de-0.15',
  es: 'vosk-model-small-es-0.42',
  zh: 'vosk-model-small-cn-0.22',
  ru: 'vosk-model-small-ru-0.22',
  pt: 'vosk-model-small-pt-0.3',
  it: 'vosk-model-small-it-0.22',
  nl: 'vosk-model-small-nl-0.22',
  hi: 'vosk-model-small-hi-0.22',
  ja: 'vosk-model-small-ja-0.22',
  ko: 'vosk-model-small-ko-0.22',
  tr: 'vosk-model-small-tr-0.3',
  pl: 'vosk-model-small-pl-0.22',
  vi: 'vosk-model-small-vn-0.4',
  uk: 'vosk-model-small-uk-v3-small',
  ca: 'vosk-model-small-ca-0.4'
};

// ─────────────────────────────────────────────────────────────────────────────
// Whisper model paths
// ─────────────────────────────────────────────────────────────────────────────
const WHISPER_EN_MODEL_DIR = process.env.WHISPER_MODEL_PATH
  ? path.dirname(path.resolve(process.env.WHISPER_MODEL_PATH))
  : path.join(ROOT, 'vosk-whisper', 'whisper', 'tiny.en');
const WHISPER_EN_MODEL_NAME = 'tiny.en';

const WHISPER_MULTILANG_MODEL_DIR = process.env.WHISPER_MULTILANG_MODEL_PATH
  ? path.dirname(path.resolve(process.env.WHISPER_MULTILANG_MODEL_PATH))
  : path.join(ROOT, 'vosk-whisper', 'whisper', 'tiny');
const WHISPER_MULTILANG_MODEL_NAME = 'tiny';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Default mode:
//   smart-auto  → English first (fast), switch to multilingual if low confidence
//   en          → English only (fastest, no switching)
//   auto        → Whisper multilingual always (slow but language-agnostic)
//   fr/de/...   → Specific language
const DEFAULT_LANGUAGE = (process.env.STT_DEFAULT_LANGUAGE || 'smart-auto').toLowerCase();
const DEFAULT_STRATEGY = (process.env.STT_STRATEGY        || 'parallel').toLowerCase();
const WHISPER_TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT_MS || '2500', 10);

// Smart-auto: if English confidence is below this, switch to multilingual
// Range: 0.0–1.0. Lower = more aggressive switching.
// 0.5 = switch if English result is less than half-confident
const SMART_AUTO_THRESHOLD = parseFloat(process.env.STT_SMART_AUTO_THRESHOLD || '0.50');

// ─────────────────────────────────────────────────────────────────────────────
// Language names (human-readable)
// ─────────────────────────────────────────────────────────────────────────────
const LANGUAGE_NAMES = {
  af:'Afrikaans',  am:'Amharic',    ar:'Arabic',     as:'Assamese',
  az:'Azerbaijani',ba:'Bashkir',    be:'Belarusian', bg:'Bulgarian',
  bn:'Bengali',    bo:'Tibetan',    br:'Breton',     bs:'Bosnian',
  ca:'Catalan',    cs:'Czech',      cy:'Welsh',      da:'Danish',
  de:'German',     el:'Greek',      en:'English',    es:'Spanish',
  et:'Estonian',   eu:'Basque',     fa:'Persian',    fi:'Finnish',
  fo:'Faroese',    fr:'French',     gl:'Galician',   gu:'Gujarati',
  ha:'Hausa',      haw:'Hawaiian',  he:'Hebrew',     hi:'Hindi',
  hr:'Croatian',   ht:'Haitian',    hu:'Hungarian',  hy:'Armenian',
  id:'Indonesian', is:'Icelandic',  it:'Italian',    ja:'Japanese',
  jw:'Javanese',   ka:'Georgian',   kk:'Kazakh',     km:'Khmer',
  kn:'Kannada',    ko:'Korean',     la:'Latin',      lb:'Luxembourgish',
  ln:'Lingala',    lo:'Lao',        lt:'Lithuanian', lv:'Latvian',
  mg:'Malagasy',   mi:'Maori',      mk:'Macedonian', ml:'Malayalam',
  mn:'Mongolian',  mr:'Marathi',    ms:'Malay',      mt:'Maltese',
  my:'Burmese',    ne:'Nepali',     nl:'Dutch',      nn:'Norwegian Nynorsk',
  no:'Norwegian',  oc:'Occitan',    pa:'Punjabi',    pl:'Polish',
  ps:'Pashto',     pt:'Portuguese', ro:'Romanian',   ru:'Russian',
  sa:'Sanskrit',   sd:'Sindhi',     si:'Sinhala',    sk:'Slovak',
  sl:'Slovenian',  sn:'Shona',      so:'Somali',     sq:'Albanian',
  sr:'Serbian',    su:'Sundanese',  sv:'Swedish',    sw:'Swahili',
  ta:'Tamil',      te:'Telugu',     tg:'Tajik',      th:'Thai',
  tk:'Turkmen',    tl:'Filipino',   tr:'Turkish',    tt:'Tatar',
  uk:'Ukrainian',  ur:'Urdu',       uz:'Uzbek',      vi:'Vietnamese',
  yi:'Yiddish',    yo:'Yoruba',     yue:'Cantonese', zh:'Chinese'
};

function getLanguageName(code) {
  if (!code || code === 'auto' || code === 'smart-auto') return 'Auto';
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Vosk model singletons — loaded lazily per language
// ─────────────────────────────────────────────────────────────────────────────
const _voskModels  = {};  // { [langCode]: vosk.Model | null }
const _voskErrors  = {};  // { [langCode]: Error }
const _voskChecked = {};  // { [langCode]: boolean } — whether we've attempted load

vosk.setLogLevel(-1); // suppress Vosk console spam

/**
 * Get or load the Vosk model for a language.
 * Returns the model if available, null if not installed or failed.
 */
function getVoskModel(langCode) {
  const lang = langCode.toLowerCase();

  if (_voskChecked[lang]) {
    return _voskModels[lang] || null;
  }

  _voskChecked[lang] = true;
  const folderName = VOSK_LANG_REGISTRY[lang];

  if (!folderName) {
    // No Vosk model defined for this language
    return null;
  }

  const modelPath = process.env.VOSK_MODEL_PATH && lang === 'en'
    ? path.resolve(process.env.VOSK_MODEL_PATH)
    : path.join(VOSK_DIR, folderName);

  if (!fs.existsSync(modelPath)) {
    if (lang !== 'en') {
      console.log(`[STT Engine] Vosk ${getLanguageName(lang)}: not installed → run .\\download-vosk-multilang.ps1`);
    }
    return null;
  }

  try {
    const model = new vosk.Model(modelPath);
    _voskModels[lang] = model;
    console.log(`✅ [STT Engine] Vosk ${getLanguageName(lang)} (${lang}) loaded → ${modelPath}`);
    return model;
  } catch (err) {
    _voskErrors[lang] = err;
    console.error(`❌ [STT Engine] Vosk ${getLanguageName(lang)} failed to load: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Whisper availability check
// ─────────────────────────────────────────────────────────────────────────────
let _whisperEnAvailable    = false;
let _whisperMultiAvailable = false;

function initWhisperModels() {
  _whisperEnAvailable    = fs.existsSync(WHISPER_EN_MODEL_DIR);
  _whisperMultiAvailable = fs.existsSync(WHISPER_MULTILANG_MODEL_DIR);

  if (_whisperEnAvailable) {
    console.log('✅ [STT Engine] Whisper EN (tiny.en) detected');
  } else {
    console.warn('⚠️  [STT Engine] Whisper EN model not found → run .\\download-whisper-fast.ps1');
  }

  if (_whisperMultiAvailable) {
    console.log('✅ [STT Engine] Whisper Multilingual (tiny) detected — 99 languages');
  } else {
    console.warn('⚠️  [STT Engine] Whisper Multilingual not found → run .\\download-whisper-multilang.ps1');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot: load EN Vosk immediately; Whisper availability check; others lazy
// ─────────────────────────────────────────────────────────────────────────────
getVoskModel('en');
initWhisperModels();

// ─────────────────────────────────────────────────────────────────────────────
// Confidence scorer
// ─────────────────────────────────────────────────────────────────────────────
function scoreTranscript(text) {
  if (!text || text.trim().length === 0) return 0;
  const t         = text.trim();
  const wordCount = t.split(/\s+/).length;
  const charCount = t.length;
  const penalty   = wordCount === 1 && charCount < 4 ? 0.3 : 0;
  return Math.max(0, (Math.min(wordCount / 10, 1) * 0.5 + Math.min(charCount / 60, 1) * 0.5) - penalty);
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level: run a specific Vosk model
// ─────────────────────────────────────────────────────────────────────────────
async function _runVosk(audioBuffer, langCode = 'en') {
  const model = getVoskModel(langCode);
  if (!model) return { text: '', latency: 0, available: false };

  const t0 = Date.now();
  const recognizer = new vosk.Recognizer({ model, sampleRate: 16000 });
  let text = '';

  try {
    const chunkSize = 4000;
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      if (recognizer.acceptWaveform(chunk)) {
        try {
          const resultStr = recognizer.result();
          const r = typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;
          if (r && r.text) text += r.text + ' ';
        } catch (parseErr) {
          // Ignore parse errors for intermediate results
        }
      }
    }
    try {
      const finalStr = recognizer.finalResult();
      const final = typeof finalStr === 'string' ? JSON.parse(finalStr) : finalStr;
      if (final && final.text) text = (text + final.text).trim();
    } catch (parseErr) {
      // If final result fails to parse, use what we have
    }
    return { text: text.trim(), latency: Date.now() - t0, available: true };
  } catch (err) {
    console.error(`[STT Engine] Vosk(${langCode}) error:`, err.message);
    return { text: '', latency: Date.now() - t0, available: true };
  } finally {
    recognizer.free();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level: run Whisper
//  language = 'en'   → tiny.en model
//  language = 'auto' → tiny multilingual, auto-detect
//  language = 'fr'   → tiny multilingual, forced French
//
// NOTE: Whisper CLI not installed. Returning empty for now.
// TODO: Install whisper CLI via pip install openai-whisper
// ─────────────────────────────────────────────────────────────────────────────
async function _runWhisper(audioBuffer, language = 'en') {
  // Whisper CLI is not available, return empty result
  // This allows Vosk to be the primary STT engine
  return { text: '', latency: 0, available: false, detectedLanguage: null };
}

function _runWhisperWithTimeout(audioBuffer, language, timeoutMs = WHISPER_TIMEOUT_MS) {
  return Promise.race([
    _runWhisper(audioBuffer, language),
    new Promise(resolve =>
      setTimeout(() => {
        console.warn(`⏱ [STT Engine] Whisper(${language}) timed out after ${timeoutMs}ms`);
        resolve({ text: '', latency: timeoutMs, available: true, timedOut: true, detectedLanguage: null });
      }, timeoutMs)
    )
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// English parallel (Vosk EN + Whisper EN)
// ─────────────────────────────────────────────────────────────────────────────
async function _runEnglishParallel(audioBuffer, strategy) {
  const t0 = Date.now();
  let voskResult    = { text: '', latency: 0, available: false };
  let whisperResult = { text: '', latency: 0, available: false, detectedLanguage: 'en' };
  let chosenText = '', chosenEngine = 'none';

  if (strategy === 'parallel') {
    [whisperResult, voskResult] = await Promise.all([
      _runWhisperWithTimeout(audioBuffer, 'en'),
      _runVosk(audioBuffer, 'en')
    ]);
    const ws = scoreTranscript(whisperResult.text);
    const vs = scoreTranscript(voskResult.text);
    if (ws >= vs && whisperResult.text) { chosenText = whisperResult.text; chosenEngine = 'whisper'; }
    else if (voskResult.text)           { chosenText = voskResult.text;    chosenEngine = 'vosk'; }

  } else if (strategy === 'whisper-first') {
    whisperResult = await _runWhisperWithTimeout(audioBuffer, 'en');
    if (whisperResult.text && whisperResult.text.length > 1) {
      chosenText = whisperResult.text; chosenEngine = 'whisper';
    } else {
      voskResult = await _runVosk(audioBuffer, 'en');
      chosenText = voskResult.text; chosenEngine = voskResult.text ? 'vosk' : 'none';
    }

  } else {
    voskResult = await _runVosk(audioBuffer, 'en');
    if (voskResult.text && voskResult.text.length > 1) {
      chosenText = voskResult.text; chosenEngine = 'vosk';
    } else {
      whisperResult = await _runWhisperWithTimeout(audioBuffer, 'en');
      chosenText = whisperResult.text; chosenEngine = whisperResult.text ? 'whisper' : 'none';
    }
  }

  return {
    text: chosenText, engine: chosenEngine,
    confidence: scoreTranscript(chosenText),
    totalLatency: Date.now() - t0,
    voskLatency: voskResult.latency, whisperLatency: whisperResult.latency
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-English parallel (Vosk [lang] + Whisper multilingual)
// Vosk model for that language must be installed for this to run.
// ─────────────────────────────────────────────────────────────────────────────
async function _runNonEnglishParallel(audioBuffer, language, strategy) {
  const t0 = Date.now();
  const hasVosk = !!getVoskModel(language);
  let voskResult    = { text: '', latency: 0, available: false };
  let whisperResult = { text: '', latency: 0, available: false, detectedLanguage: language };
  let chosenText = '', chosenEngine = 'none';

  if (hasVosk && strategy !== 'whisper-first') {
    // Full parallel: Vosk(language) + Whisper multilingual
    [whisperResult, voskResult] = await Promise.all([
      _runWhisperWithTimeout(audioBuffer, language, WHISPER_TIMEOUT_MS * 1.5),
      _runVosk(audioBuffer, language)
    ]);
    const ws = scoreTranscript(whisperResult.text);
    const vs = scoreTranscript(voskResult.text);
    console.log(`[STT Engine] Parallel ${language}: Whisper="${whisperResult.text}"(${ws.toFixed(2)}) | Vosk="${voskResult.text}"(${vs.toFixed(2)})`);
    if (ws >= vs && whisperResult.text) { chosenText = whisperResult.text; chosenEngine = 'whisper'; }
    else if (voskResult.text)           { chosenText = voskResult.text;    chosenEngine = 'vosk'; }

  } else if (hasVosk && strategy === 'whisper-first') {
    // Whisper first, Vosk fallback
    whisperResult = await _runWhisperWithTimeout(audioBuffer, language, WHISPER_TIMEOUT_MS * 1.5);
    if (whisperResult.text && whisperResult.text.length > 1) {
      chosenText = whisperResult.text; chosenEngine = 'whisper';
    } else {
      voskResult = await _runVosk(audioBuffer, language);
      chosenText = voskResult.text; chosenEngine = voskResult.text ? 'vosk' : 'none';
    }

  } else {
    // Whisper-only (no Vosk model for this language)
    whisperResult = await _runWhisperWithTimeout(audioBuffer, language, WHISPER_TIMEOUT_MS * 1.5);
    chosenText = whisperResult.text; chosenEngine = whisperResult.text ? 'whisper' : 'none';
  }

  const fusionMode = hasVosk ? `parallel-${language}` : `whisper-only-${language}`;
  return {
    text: chosenText, engine: chosenEngine,
    confidence: scoreTranscript(chosenText),
    totalLatency: Date.now() - t0,
    voskLatency: voskResult.latency, whisperLatency: whisperResult.latency,
    fusionMode, detectedLanguage: language
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ★ SMART AUTO — The flagship mode
//
//  Step 1: Run English parallel (fast) → get enResult
//  Step 2: if enResult.confidence >= SMART_AUTO_THRESHOLD → done, return English
//  Step 3: if confidence too low → run Whisper multilingual auto-detect
//  Step 4: Compare multilang result with English result → pick best
//  Step 5: If multilang is better → re-run with that language for full fusion
// ─────────────────────────────────────────────────────────────────────────────
async function _transcribeSmartAuto(audioBuffer, strategy) {
  const t0 = Date.now();
  console.log(`[STT Engine] Smart-Auto: trying English first (threshold: ${SMART_AUTO_THRESHOLD})`);

  // Step 1: English fast path
  const enResult = await _runEnglishParallel(audioBuffer, strategy);
  console.log(`[STT Engine] Smart-Auto EN: "${enResult.text}" | conf:${enResult.confidence.toFixed(2)}`);

  // Step 2: High confidence → English confirmed → return
  if (enResult.confidence >= SMART_AUTO_THRESHOLD) {
    console.log('✅ [STT Engine] Smart-Auto: English confirmed (high confidence)');
    return _buildResult({
      text: enResult.text, engine: enResult.engine, strategy: strategy || DEFAULT_STRATEGY,
      language: 'en', detectedLanguage: 'en', languageName: 'English',
      confidence: enResult.confidence,
      voskLatency: enResult.voskLatency, whisperLatency: enResult.whisperLatency,
      totalLatency: Date.now() - t0
    });
  }

  // Step 3: Low confidence → user might not be speaking English
  console.log(`[STT Engine] Smart-Auto: Low EN confidence (${enResult.confidence.toFixed(2)}) → trying multilingual...`);

  if (!_whisperMultiAvailable) {
    console.warn('[STT Engine] Smart-Auto: Multilingual model not available — using EN result');
    return _buildResult({
      text: enResult.text, engine: enResult.engine, strategy: 'smart-auto',
      language: 'en', detectedLanguage: 'en', languageName: 'English',
      confidence: enResult.confidence,
      voskLatency: enResult.voskLatency, whisperLatency: enResult.whisperLatency,
      totalLatency: Date.now() - t0
    });
  }

  // Step 4: Run Whisper multilingual auto-detect
  const multiResult = await _runWhisperWithTimeout(audioBuffer, 'auto', WHISPER_TIMEOUT_MS * 1.5);
  const multiConf   = scoreTranscript(multiResult.text);

  console.log(`[STT Engine] Smart-Auto Multilang: "${multiResult.text}" | lang:${multiResult.detectedLanguage} | conf:${multiConf.toFixed(2)}`);

  // Step 5: Compare — if multilang isn't better either, keep English
  if (multiConf <= enResult.confidence || !multiResult.text) {
    console.log('[STT Engine] Smart-Auto: English result was better — keeping it');
    return _buildResult({
      text: enResult.text, engine: enResult.engine, strategy: 'smart-auto',
      language: 'en', detectedLanguage: 'en', languageName: 'English',
      confidence: enResult.confidence,
      voskLatency: enResult.voskLatency, whisperLatency: enResult.whisperLatency,
      totalLatency: Date.now() - t0
    });
  }

  // Multilang wins — determine the detected language
  const detectedLang = multiResult.detectedLanguage || 'auto';
  const langName     = getLanguageName(detectedLang);

  console.log(`🌍 [STT Engine] Smart-Auto: Switched to ${langName} (${detectedLang}) | conf:${multiConf.toFixed(2)}`);

  // Step 6: If we have a Vosk model for this language, run full parallel fusion now
  if (detectedLang && detectedLang !== 'en' && detectedLang !== 'auto' && getVoskModel(detectedLang)) {
    console.log(`[STT Engine] Smart-Auto: Running full parallel fusion for ${langName}...`);
    const fullResult = await _runNonEnglishParallel(audioBuffer, detectedLang, strategy);
    return _buildResult({
      text: fullResult.text, engine: fullResult.engine, strategy: 'smart-auto',
      language: detectedLang, detectedLanguage: detectedLang, languageName: langName,
      confidence: fullResult.confidence, autoSwitched: true,
      voskLatency: fullResult.voskLatency, whisperLatency: fullResult.whisperLatency,
      totalLatency: Date.now() - t0
    });
  }

  // Use the multilang Whisper result as-is
  return _buildResult({
    text: multiResult.text, engine: 'whisper', strategy: 'smart-auto',
    language: detectedLang, detectedLanguage: detectedLang, languageName: langName,
    confidence: multiConf, autoSwitched: true,
    voskLatency: enResult.voskLatency, whisperLatency: multiResult.latency,
    totalLatency: Date.now() - t0
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Result builder
// ─────────────────────────────────────────────────────────────────────────────
function _buildResult({ text, engine, strategy, language, detectedLanguage, languageName, confidence, voskLatency, whisperLatency, totalLatency, autoSwitched = false, fusionMode }) {
  return {
    text:             text || '',
    engine,
    strategy,
    fusionMode:       fusionMode || (engine === 'vosk' && whisperLatency > 0 ? `parallel-${language}` : `${engine}-${language}`),
    language,
    detectedLanguage: detectedLanguage || language,
    languageName:     languageName || getLanguageName(language),
    autoSwitched,         // true when smart-auto triggered a language switch
    confidence:       parseFloat((confidence || 0).toFixed(4)),
    latency: {
      vosk:    voskLatency    || 0,
      whisper: whisperLatency || 0,
      total:   totalLatency   || 0
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ★ PUBLIC: transcribe(audioBuffer, options)
//
//  options:
//    language : 'smart-auto' | 'en' | 'auto' | 'fr' | 'ar' | 'zh' | ...
//    strategy : 'parallel' | 'whisper-first' | 'vosk-first'
//
//  Returns full result object (see _buildResult for shape)
// ─────────────────────────────────────────────────────────────────────────────
async function transcribe(audioBuffer, options = {}) {
  const language = (options.language || DEFAULT_LANGUAGE).toLowerCase();
  const strategy = (options.strategy || DEFAULT_STRATEGY).toLowerCase();

  // ── Smart Auto (default): English-first, auto-switch if needed
  if (language === 'smart-auto') {
    return _transcribeSmartAuto(audioBuffer, strategy);
  }

  // ── English only
  if (language === 'en') {
    const t0 = Date.now();
    const r  = await _runEnglishParallel(audioBuffer, strategy);
    return _buildResult({
      text: r.text, engine: r.engine, strategy, language: 'en',
      detectedLanguage: 'en', languageName: 'English', confidence: r.confidence,
      voskLatency: r.voskLatency, whisperLatency: r.whisperLatency,
      totalLatency: Date.now() - t0
    });
  }

  // ── Whisper auto-detect (no language specified at all)
  if (language === 'auto') {
    const t0 = Date.now();
    const r  = await _runWhisperWithTimeout(audioBuffer, 'auto', WHISPER_TIMEOUT_MS * 1.5);
    const detectedLang = r.detectedLanguage || null;
    return _buildResult({
      text: r.text, engine: r.text ? 'whisper' : 'none', strategy: 'whisper-only',
      language: 'auto', detectedLanguage: detectedLang,
      languageName: getLanguageName(detectedLang),
      confidence: scoreTranscript(r.text),
      voskLatency: 0, whisperLatency: r.latency,
      totalLatency: Date.now() - t0
    });
  }

  // ── Specific non-English language (with Vosk parallel fusion if model installed)
  const t0 = Date.now();
  const r  = await _runNonEnglishParallel(audioBuffer, language, strategy);
  return _buildResult({
    text: r.text, engine: r.engine, strategy,
    language, detectedLanguage: language,
    languageName: getLanguageName(language),
    confidence: r.confidence, fusionMode: r.fusionMode,
    voskLatency: r.voskLatency, whisperLatency: r.whisperLatency,
    totalLatency: Date.now() - t0
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING — uses Vosk for live partials, full transcribe() at stream end
// ─────────────────────────────────────────────────────────────────────────────
function transcribeStream(audioStream, callbacks = {}, options = {}) {
  const { onPartial, onFinal, onError } = callbacks;
  const language = (options.language || DEFAULT_LANGUAGE).toLowerCase();

  // For live streaming, always use EN Vosk (fastest for partials)
  const streamLang = language === 'en' || language === 'smart-auto' ? 'en' : language;
  const model = getVoskModel(streamLang) || getVoskModel('en');

  if (!model) {
    if (onError) onError(new Error('Vosk model not loaded — streaming unavailable'));
    return;
  }

  const recognizer = new vosk.Recognizer({ model, sampleRate: 16000 });
  const chunks = [];

  audioStream.on('data', (chunk) => {
    try {
      chunks.push(chunk);
      if (recognizer.acceptWaveform(chunk)) {
        const r = JSON.parse(recognizer.result());
        if (r.text && onPartial) onPartial(r.text);
      } else {
        const partial = JSON.parse(recognizer.partialResult());
        if (partial.partial && onPartial) onPartial(partial.partial);
      }
    } catch (err) {
      console.error('[STT Engine] Stream chunk error:', err.message);
    }
  });

  audioStream.on('end', async () => {
    try {
      recognizer.free();
      if (chunks.length > 0) {
        const fullBuffer = Buffer.concat(chunks);
        const result = await transcribe(fullBuffer, options);
        if (onFinal) onFinal(result);
      } else {
        if (onFinal) onFinal(_buildResult({ text: '', engine: 'none', strategy: 'stream', language, detectedLanguage: null, languageName: getLanguageName(language), confidence: 0, voskLatency: 0, whisperLatency: 0, totalLatency: 0 }));
      }
    } catch (err) {
      console.error('[STT Engine] Stream final error:', err.message);
      if (onError) onError(err);
    }
  });

  audioStream.on('error', (err) => {
    try { recognizer.free(); } catch {}
    if (onError) onError(err);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS — health endpoint
// ─────────────────────────────────────────────────────────────────────────────
function getStatus() {
  const voskStatus = {};
  for (const [lang, folder] of Object.entries(VOSK_LANG_REGISTRY)) {
    const modelPath = lang === 'en' && process.env.VOSK_MODEL_PATH
      ? path.resolve(process.env.VOSK_MODEL_PATH)
      : path.join(VOSK_DIR, folder);
    const installed = fs.existsSync(modelPath);
    const loaded    = !!_voskModels[lang];
    voskStatus[lang] = {
      language: getLanguageName(lang),
      installed, loaded,
      folder,
      parallelFusion: installed  // has Vosk → parallel fusion enabled for this lang
    };
  }

  const installedLangs  = Object.entries(voskStatus).filter(([,v]) => v.installed).map(([k]) => k);
  const multilangLangs  = installedLangs.filter(l => l !== 'en');

  return {
    mode:              DEFAULT_LANGUAGE,
    smartAutoThreshold: SMART_AUTO_THRESHOLD,
    defaultStrategy:   DEFAULT_STRATEGY,
    whisperTimeoutMs:  WHISPER_TIMEOUT_MS,
    whisperEn:         { available: _whisperEnAvailable,    modelDir: WHISPER_EN_MODEL_DIR },
    whisperMultilingual: { available: _whisperMultiAvailable, modelDir: WHISPER_MULTILANG_MODEL_DIR, languages: 99 },
    vosk: {
      installedLanguages:      installedLangs,
      parallelFusionLanguages: multilangLangs,
      models:                  voskStatus
    },
    supportedLanguages: Object.keys(LANGUAGE_NAMES),
    downloadScripts: {
      whisperMultilingual: 'download-whisper-multilang.ps1',
      voskMultilingual:    'download-vosk-multilang.ps1'
    }
  };
}

module.exports = {
  transcribe,
  transcribeStream,
  getStatus,
  scoreTranscript,
  getLanguageName,
  LANGUAGE_NAMES,
  VOSK_LANG_REGISTRY
};
