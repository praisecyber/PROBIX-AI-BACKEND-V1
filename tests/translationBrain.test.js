const test = require('node:test');
const assert = require('node:assert/strict');

const { buildBrainEnhancedTranslation } = require('../utils/translationBrain');

test('buildBrainEnhancedTranslation returns the translated text when the brain is disabled', async () => {
  const result = await buildBrainEnhancedTranslation({
    text: 'Hello world',
    sourceLang: 'eng_Latn',
    targetLang: 'yor_Latn',
    translation: 'Mo ki aye',
    useBrain: false,
  });

  assert.equal(result, 'Mo ki aye');
});

test('buildBrainEnhancedTranslation uses the AI brain response when available', async () => {
  const result = await buildBrainEnhancedTranslation({
    text: 'Hello world',
    sourceLang: 'eng_Latn',
    targetLang: 'yor_Latn',
    translation: 'Mo ki aye',
    useBrain: true,
    aiResponse: 'Mo ka dunia',
  });

  assert.equal(result, 'Mo ka dunia');
});
