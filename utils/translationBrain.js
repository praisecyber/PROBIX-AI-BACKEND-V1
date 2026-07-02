const { askGeminiMath } = require('./geminiClient');

async function buildBrainEnhancedTranslation({
  text,
  sourceLang,
  targetLang,
  translation,
  useBrain = true,
  aiResponse = null,
}) {
  if (!useBrain || !text) {
    return translation;
  }

  if (aiResponse) {
    return aiResponse;
  }

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return translation;
  }

  const prompt = [
    {
      role: 'user',
      content: `Refine this translation so it reads naturally in ${targetLang}. Preserve the meaning of: "${text}". The initial translation is: "${translation}". Respond with only the improved translation.`,
    },
  ];

  const brainText = await askGeminiMath({
    question: prompt[0].content,
    language: targetLang,
    maxTokens: 400,
  });

  return brainText?.trim() || translation;
}

module.exports = {
  buildBrainEnhancedTranslation,
};
