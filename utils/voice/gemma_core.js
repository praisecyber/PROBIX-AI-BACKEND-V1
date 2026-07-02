const axios = require('axios');

const GEMMA_URL = process.env.GEMMA_URL || 'http://localhost:8002';

async function generate({ prompt, history = [], max_tokens = 512, temperature = 0.7 }) {
  const res = await axios.post(`${GEMMA_URL}/generate`, {
    prompt,
    history,
    max_tokens,
    temperature,
  }, { timeout: 600000 });
  return res.data && res.data.response ? res.data.response : res.data;
}

module.exports = { generate };
