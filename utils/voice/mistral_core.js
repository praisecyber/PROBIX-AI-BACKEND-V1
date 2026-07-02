const axios = require('axios');

const MISTRAL_URL = process.env.MISTRAL_URL || 'http://localhost:8001';

async function generate({ prompt, history = [], max_tokens = 512, temperature = 0.7 }) {
  const res = await axios.post(`${MISTRAL_URL}/generate`, {
    prompt,
    history,
    max_tokens,
    temperature,
  }, { timeout: 600000 });
  return res.data && res.data.response ? res.data.response : res.data;
}

module.exports = { generate };
