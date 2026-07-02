const mistral = require('./mistral_core');
const gemma = require('./gemma_core');
const OpenAI = require('openai');

// Gemini fallback setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DISABLE_GEMINI_FALLBACK = String(process.env.DISABLE_GEMINI_FALLBACK || '').toLowerCase() === 'true';
let geminiClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new OpenAI({ 
    apiKey: GEMINI_API_KEY, 
    baseURL: GEMINI_API_BASE_URL 
  });
}

// Response cache for repeat questions (in-memory cache)
const responseCache = new Map();
// Cache expires after 1 hour (3600000ms)
const CACHE_TTL = 3600000;

// Supported language names (subset — for AI instruction clarity)
const LANGUAGE_NAMES = {
  af:'Afrikaans', am:'Amharic', ar:'Arabic', az:'Azerbaijani', be:'Belarusian',
  bg:'Bulgarian', bn:'Bengali', bs:'Bosnian', ca:'Catalan', cs:'Czech',
  cy:'Welsh', da:'Danish', de:'German', el:'Greek', en:'English',
  es:'Spanish', et:'Estonian', eu:'Basque', fa:'Persian', fi:'Finnish',
  fr:'French', gl:'Galician', gu:'Gujarati', ha:'Hausa', he:'Hebrew',
  hi:'Hindi', hr:'Croatian', hu:'Hungarian', hy:'Armenian', id:'Indonesian',
  is:'Icelandic', it:'Italian', ja:'Japanese', ka:'Georgian', kk:'Kazakh',
  km:'Khmer', kn:'Kannada', ko:'Korean', lo:'Lao', lt:'Lithuanian',
  lv:'Latvian', mi:'Maori', mk:'Macedonian', ml:'Malayalam', mn:'Mongolian',
  mr:'Marathi', ms:'Malay', mt:'Maltese', my:'Burmese', ne:'Nepali',
  nl:'Dutch', no:'Norwegian', pa:'Punjabi', pl:'Polish', ps:'Pashto',
  pt:'Portuguese', ro:'Romanian', ru:'Russian', si:'Sinhala', sk:'Slovak',
  sl:'Slovenian', so:'Somali', sq:'Albanian', sr:'Serbian', sv:'Swedish',
  sw:'Swahili', ta:'Tamil', te:'Telugu', th:'Thai', tl:'Filipino',
  tr:'Turkish', uk:'Ukrainian', ur:'Urdu', uz:'Uzbek', vi:'Vietnamese',
  yo:'Yoruba', yue:'Cantonese', zh:'Chinese'
};

function getLangName(code) {
  if (!code || code === 'en') return 'English';
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Response Fusion Layer
 * Combines outputs from Mistral and Gemma with advanced features
 */
class ResponseFusion {
  /**
   * Check cache for existing responses
   */
  static checkCache(prompt, language = 'en') {
    const cacheKey = `${language}:${prompt.trim().toLowerCase()}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Fusion: Using cached responses!');
      return cached.data;
    }
    return null;
  }

  /**
   * Save responses to cache
   */
  static saveToCache(prompt, data, language = 'en') {
    const cacheKey = `${language}:${prompt.trim().toLowerCase()}`;
    responseCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Detect topic of the prompt
   * Returns: 'coding', 'explanation', or 'general'
   */
  static detectTopic(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    // Coding keywords
    const codingKeywords = ['code', 'function', 'javascript', 'python', 'programming', 'bug', 'debug', 'algorithm', 'api', 'html', 'css'];
    // Explanation keywords
    const explanationKeywords = ['explain', 'how', 'what', 'why', 'simplify', 'concept', 'teach', 'learn', 'understand', 'describe'];
    
    const hasCoding = codingKeywords.some(keyword => lowerPrompt.includes(keyword));
    const hasExplanation = explanationKeywords.some(keyword => lowerPrompt.includes(keyword));
    
    if (hasCoding && !hasExplanation) {
      return 'coding';
    } else if (hasExplanation && !hasCoding) {
      return 'explanation';
    } else {
      return 'general';
    }
  }

  /**
   * Get both model outputs in parallel
   */
  static async getBothResponses({ prompt, history = [], language = 'en', max_tokens = 1024, temperature = 0.7 }) {
    // Check cache first (language-aware key)
    const cached = this.checkCache(prompt, language);
    if (cached) {
      return cached;
    }

    // Build a language-prefixed prompt so both models respond in the right language
    const localizedPrompt = language && language !== 'en'
      ? `[IMPORTANT: The user is speaking ${getLangName(language)}. You MUST respond ONLY in ${getLangName(language)}. Do NOT respond in English unless the user spoke English.]\n\n${prompt}`
      : prompt;

    console.log(`Fusion: Getting responses from Mistral + Gemma... (language: ${getLangName(language)})`);

    try {
      const [mistralResponse, gemmaResponse] = await Promise.all([
        mistral.generate({ prompt: localizedPrompt, history, max_tokens, temperature }).catch(e => {
          console.warn('Mistral unavailable, using Gemini:', e.message);
          return null;
        }),
        gemma.generate({ prompt: localizedPrompt, history, max_tokens, temperature }).catch(e => {
          console.warn('Gemma unavailable, using Gemini:', e.message);
          return null;
        })
      ]);

      // If both failed, use Gemini fallback
      if (!mistralResponse && !gemmaResponse) {
        if (DISABLE_GEMINI_FALLBACK) {
          throw new Error('Both Mistral and Gemma are unavailable, and Gemini fallback is disabled. Use a single model or enable Gemini fallback.');
        }
        console.log('Fusion: Both Mistral and Gemma unavailable, using Gemini fallback');
        const geminiResponse = await this.getGeminiResponse({ prompt: localizedPrompt, max_tokens, temperature });
        const data = { mistral: geminiResponse, gemma: null };
        this.saveToCache(prompt, data, language);
        return data;
      }

      console.log('Fusion: Received both model outputs');
      const data = { mistral: mistralResponse, gemma: gemmaResponse };
      this.saveToCache(prompt, data, language);
      return data;
    } catch (err) {
      console.error('Fusion: Error getting responses:', err.message);
      if (DISABLE_GEMINI_FALLBACK) {
        throw new Error('Response Fusion failed and Gemini fallback is disabled. Verify Mistral/Gemma availability.');
      }
      console.error('Fusion: Using Gemini fallback after error');
      const geminiResponse = await this.getGeminiResponse({ prompt: localizedPrompt, max_tokens, temperature });
      const data = { mistral: geminiResponse, gemma: null };
      this.saveToCache(prompt, data, language);
      return data;
    }
  }

  /**
   * Synthesize both responses with topic-aware weighting!
   */
  static async synthesizeResponses({ mistralOutput, gemmaOutput, originalPrompt, language = 'en' }) {
    console.log(`Fusion: Synthesizing both responses... (language: ${getLangName(language)})`);
    const topic = this.detectTopic(originalPrompt);

    let topicPrompt = '';
    if (topic === 'coding') {
      topicPrompt = "This is a coding question. Prioritize Mistral's technical details and code accuracy. Use Gemma for clarifying comments.";
    } else if (topic === 'explanation') {
      topicPrompt = "This is an educational/explanation question. Prioritize Gemma's clarity and simplified explanations. Use Mistral for technical depth.";
    } else {
      topicPrompt = 'Balance both answers equally.';
    }

    // Language instruction for synthesis
    const langInstruction = language && language !== 'en'
      ? `CRITICAL: The user spoke in ${getLangName(language)}. Your FINAL ANSWER must be written ENTIRELY in ${getLangName(language)}. Do NOT use English.\n`
      : '';

    const synthesisPrompt = `
You have two expert answers to the same question.
Synthesize them into ONE cohesive, complete response that combines the best of both.
${topicPrompt}
${langInstruction}
ORIGINAL QUESTION:
${originalPrompt}

---

ANSWER A (Technical, from Mistral - Primary Intelligence Engine):
${mistralOutput}

---

ANSWER B (Educational, from Gemma - Quality & Education Engine):
${gemmaOutput}

---

INSTRUCTIONS:
1. Combine both answers into a single, flowing response
2. Remove duplicate information
3. Make it sound natural, not like two separate answers stuck together
4. Keep it concise but complete
5. After the answer, add a "CONFIDENCE NOTES" section where you flag any parts you're uncertain about
${language && language !== 'en' ? `6. Write the ENTIRE final answer in ${getLangName(language)} — this is mandatory` : ''}

FINAL ANSWER:
`;

    const synthesizedResponse = await mistral.generate({
      prompt: synthesisPrompt,
      max_tokens: 2560,
      temperature: 0.6
    });
    console.log('Fusion: Synthesis complete!');
    return synthesizedResponse;
  }

  /**
   * Merge strengths of both responses with all features!
   * If only one response is available, return it directly
   */
  static async mergeResponses({ mistralOutput, gemmaOutput, originalPrompt, language = 'en' }) {
    console.log('Fusion: Merging responses...');

    // If one or both outputs are null, return what we have
    if (!gemmaOutput || !mistralOutput) {
      const output = mistralOutput || gemmaOutput || '';
      console.log('Fusion: Single output available, skipping synthesis');
      return {
        mistral:  mistralOutput,
        gemma:    gemmaOutput,
        merged:   output,
        final:    output,
        topic:    this.detectTopic(originalPrompt),
        language
      };
    }

    const synthesized = await this.synthesizeResponses({
      mistralOutput,
      gemmaOutput,
      originalPrompt,
      language
    });

    return {
      mistral:  mistralOutput,
      gemma:    gemmaOutput,
      merged:   synthesized,
      final:    synthesized,
      topic:    this.detectTopic(originalPrompt),
      language
    };
  }

  /**
   * Get response from Gemini as fallback
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async getGeminiResponse({ prompt, max_tokens = 1024, temperature = 0.7 }) {
    if (!geminiClient) {
      throw new Error('Gemini is not configured (GEMINI_API_KEY not set)');
    }

    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const completion = await geminiClient.chat.completions.create({
          model: 'gemini-2.0-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens
        });

        return completion?.choices?.[0]?.message?.content || '';
      } catch (error) {
        const status = parseInt(error.status || error?.response?.status, 10);
        const errorText = error.message || JSON.stringify(error?.response?.data || error);
        console.error(`Gemini fallback attempt ${attempt} failed: ${status || 'unknown'} ${errorText}`);

        if ([429, 502, 503, 504].includes(status) && attempt < maxAttempts) {
          const waitTime = 2000 * Math.pow(2, attempt - 1);
          console.log(`[Gemini Retry] Waiting ${waitTime}ms before retrying (attempt ${attempt + 1}/${maxAttempts})...`);
          await this.sleep(waitTime);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Gemini fallback failed after retrying due to rate limit or transient error.');
  }

  /**
   * Full fusion pipeline: get both → merge → final answer
   * @param {object} opts — { prompt, history, language, max_tokens, temperature }
   */
  static async generate({ prompt, history = [], language = 'en', max_tokens = 1024, temperature = 0.7 }) {
    const responses = await this.getBothResponses({ prompt, history, language, max_tokens, temperature });
    const merged = await this.mergeResponses({
      mistralOutput:  responses.mistral,
      gemmaOutput:    responses.gemma,
      originalPrompt: prompt,
      language
    });
    return merged;
  }
}

module.exports = ResponseFusion;
