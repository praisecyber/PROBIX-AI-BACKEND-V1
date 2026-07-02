const path = require("path");
const OpenAI = require("openai");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai/";
let openai = null;

if (!GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY is not set. Gemini calls will fail until the env var is provided."
  );
} else {
  openai = new OpenAI({ 
    apiKey: GEMINI_API_KEY, 
    baseURL: GEMINI_API_BASE_URL 
  });
}

function extractJsonObject(text = "") {
  const jsonMatch = text.match(/(\{[\s\S]*\})/m);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (error) {
    return null;
  }
}

// Simple delay helper with logging
function delay(ms, attempt) {
  console.log(`[Rate Limit] Attempt ${attempt}: Waiting ${ms/1000} seconds...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function askGeminiMath({ question, language = "English", maxTokens = 1200 }) {
  if (!openai) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY (or OPENAI_API_KEY) before calling Gemini math/STEM.");
  }

  console.log(`[AI Request] Sending question to Gemini: "${question}" (${language})`);

  const prompt = [
    {
      role: "user",
      content: `Solve this math problem: ${question}. Answer in ${language}.`,
    },
  ];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[AI Request] Attempt ${attempts}/${maxAttempts}...`);
      
      const completion = await openai.chat.completions.create({
        model: "gemini-3.5-flash",
        messages: prompt,
        temperature: 0.2,
        max_tokens: maxTokens,
      });

      const text = completion?.choices?.[0]?.message?.content || "";
      console.log(`[AI Request] Attempt ${attempts} successful!`);
      return text;
    } catch (error) {
      console.error(`[AI Request] Attempt ${attempts} failed:`, error.message);
      
      // If it's a rate limit error (429), wait and try again with exponential backoff
      if (error.status === 429 && attempts < maxAttempts) {
        // Exponential backoff: wait 2s, then 4s, then 8s...
        const waitTime = Math.pow(2, attempts) * 1000;
        await delay(waitTime, attempts);
      } else {
        // Re-throw if it's not a rate limit or we've exhausted retries
        console.error(`[AI Request] Max attempts (${maxAttempts}) exhausted.`);
        throw error;
      }
    }
  }
  
  // This line should theoretically never be hit due to the throw inside the loop
  throw new Error("Max retries exceeded due to rate limits.");
}

module.exports = {
  askGeminiMath,
  extractJsonObject,
};
