const mistral = require('./mistral_core');
const gemma = require('./gemma_core');

// System prompts for each role
const MISTRAL_SYSTEM_PROMPT = `You are the PRIMARY INTELLIGENCE ENGINE.
Your responsibilities:
- Reasoning
- Tool calling (where applicable)
- Coding
- Planning
- Fast responses
- Multi-step tasks

Generate a draft answer.`;

const GEMMA_SYSTEM_PROMPT = `You are the QUALITY & EDUCATION ENGINE.
Your responsibilities:
- Clarify explanations
- Simplify difficult concepts
- Improve readability
- Validate responses
- Educational formatting

Take the draft answer below and refine it for clarity, education, and quality.`;

async function generateRefinedAnswer({ 
  prompt, 
  history = [], 
  max_tokens_mistral = 1024,
  max_tokens_gemma = 1024,
  temperature = 0.7
}) {
  // Step 1: Get draft from Mistral
  console.log('Step 1: Generating draft with Mistral...');
  const draft = await mistral.generate({
    prompt: `${MISTRAL_SYSTEM_PROMPT}\n\nUser prompt: ${prompt}`,
    history,
    max_tokens: max_tokens_mistral,
    temperature
  });

  console.log('Step 2: Refining with Gemma...');
  const refined = await gemma.generate({
    prompt: `${GEMMA_SYSTEM_PROMPT}\n\nDraft answer: ${draft}`,
    history,
    max_tokens: max_tokens_gemma,
    temperature: 0.6 // Slightly lower for more consistent refinement
  });

  return {
    draft,
    refined
  };
}

module.exports = { generateRefinedAnswer };
