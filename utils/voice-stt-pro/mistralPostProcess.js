'use strict';

const axios = require('axios');
require('dotenv').config();

const MISTRAL_URL   = process.env.MISTRAL_URL   || 'http://localhost:11434/api/generate';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral';

// Language names for post-processing instructions
const LANGUAGE_NAMES = {
  af:'Afrikaans', ar:'Arabic', bg:'Bulgarian', bn:'Bengali', bs:'Bosnian',
  ca:'Catalan', cs:'Czech', cy:'Welsh', da:'Danish', de:'German', el:'Greek',
  en:'English', es:'Spanish', et:'Estonian', fa:'Persian', fi:'Finnish',
  fr:'French', gl:'Galician', gu:'Gujarati', he:'Hebrew', hi:'Hindi',
  hr:'Croatian', hu:'Hungarian', hy:'Armenian', id:'Indonesian', it:'Italian',
  ja:'Japanese', ka:'Georgian', kk:'Kazakh', km:'Khmer', kn:'Kannada',
  ko:'Korean', lt:'Lithuanian', lv:'Latvian', mk:'Macedonian', ml:'Malayalam',
  mn:'Mongolian', mr:'Marathi', ms:'Malay', mt:'Maltese', my:'Burmese',
  ne:'Nepali', nl:'Dutch', no:'Norwegian', pa:'Punjabi', pl:'Polish',
  pt:'Portuguese', ro:'Romanian', ru:'Russian', si:'Sinhala', sk:'Slovak',
  sl:'Slovenian', sq:'Albanian', sr:'Serbian', sv:'Swedish', sw:'Swahili',
  ta:'Tamil', te:'Telugu', th:'Thai', tl:'Filipino', tr:'Turkish',
  uk:'Ukrainian', ur:'Urdu', uz:'Uzbek', vi:'Vietnamese', yue:'Cantonese', zh:'Chinese'
};

function getLangName(code) {
  if (!code) return 'English';
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

function basicCleanup(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[a-z]/, (match) => match.toUpperCase())
    .replace(/\s*([.,!?])\s*/g, '$1 ');
}

/**
 * Post-process raw STT transcript using Mistral.
 * Language-aware: instructs Mistral to fix text in the correct language.
 *
 * @param {string} rawText   — raw transcript from STT engine
 * @param {string} language  — BCP-47 language code (e.g. 'fr', 'ar', 'en')
 * @returns {Promise<string>}
 */
async function postProcessWithMistral(rawText, language = 'en') {
  if (!rawText || rawText.split(' ').length <= 2) {
    return basicCleanup(rawText);
  }

  const langName = getLangName(language);
  const isEnglish = language === 'en' || language === 'en-gb';

  // Language-specific instructions
  const langInstruction = isEnglish
    ? 'Fix only: capitalization, punctuation, homophones (to/too/two, there/their, buy/by), word boundaries. Do NOT change meaning. Do NOT add words.'
    : `Fix only: capitalization and punctuation for ${langName}. Do NOT translate. Do NOT change the language. Keep all words in ${langName}. Do NOT change meaning. Do NOT add words.`;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 2000);

    const response = await axios.post(
      MISTRAL_URL,
      {
        model:  MISTRAL_MODEL,
        prompt: `You are a speech-to-text correction assistant for ${langName}. ${langInstruction} Return ONLY the corrected text, nothing else.\n\nRaw text: ${rawText}\n`,
        options: { temperature: 0.1, num_predict: 200 },
        stream:  false
      },
      {
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    clearTimeout(timeoutId);

    if (response.data && response.data.response) {
      return response.data.response.trim();
    }

    return basicCleanup(rawText);
  } catch (err) {
    // Timeout or Mistral offline — use basic cleanup
    if (err.code === 'ERR_CANCELED' || err.message.includes('aborted')) {
      console.warn(`[PostProcess] Mistral timeout — using basic cleanup (${langName})`);
    } else {
      console.error('[PostProcess] Mistral error:', err.message);
    }
    return basicCleanup(rawText);
  }
}

module.exports = { postProcessWithMistral };
