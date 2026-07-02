const mistral = require('../utils/voice/mistral_core');
const gemma = require('../utils/voice/gemma_core');
const oldFusion = require('../utils/voice/fusion');
const ResponseFusion = require('../utils/voice/responseFusion');
const MemoryManager = require('../utils/voice/memoryManager');
const ttsManager = require('../utils/voice/tts_manager');
const { pickModel } = require('../utils/voice/modelSelector');

async function generate(req, res) {
  try {
    const { 
      prompt, 
      history = [], 
      model, 
      userId,
      max_tokens = 1024,
      temperature = 0.7,
      useMemory = true
    } = req.body;
    
    // Use Memory Layer if userId is provided
    let fullHistory = history;
    if (useMemory && userId) {
      const memContext = await MemoryManager.getContext(userId);
      fullHistory = [...memContext.conversation, ...history];
    }

    const chosen = pickModel(model);
    
    let responseData;
    let finalResponse;
    
    if (chosen === 'merge') {
      console.log('Voice: Using Response Fusion Layer (merge)');
      responseData = await ResponseFusion.generate({ 
        prompt, 
        history: fullHistory, 
        max_tokens, 
        temperature 
      });
      finalResponse = responseData.merged;
    } else if (chosen === 'fusion') {
      console.log('Voice: Using Old Fusion Pipeline (draft/refine)');
      responseData = await oldFusion.generateRefinedAnswer({ 
        prompt, 
        history: fullHistory, 
        max_tokens_mistral: max_tokens,
        max_tokens_gemma: max_tokens,
        temperature 
      });
      finalResponse = responseData.refined;
    } else {
      console.log(`Voice: Using single model: ${chosen}`);
      const generator = chosen === 'gemma' ? gemma.generate : mistral.generate;
      const singleResponse = await generator({ 
        prompt, 
        history: fullHistory, 
        max_tokens, 
        temperature 
      });
      responseData = { response: singleResponse };
      finalResponse = singleResponse;
    }
    
    // Save to memory if userId is provided
    if (useMemory && userId) {
      await MemoryManager.saveVoiceSession(userId, chosen, prompt, finalResponse);
    }
    
    return res.status(200).json({ 
      success: true, 
      model: chosen,
      response: finalResponse,
      ...responseData
    });
  } catch (err) {
    console.error('Voice generate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function tts(req, res) {
  try {
    const { text, language, voice, speed, useFallback } = req.body;
    const ttsResult = await ttsManager.tts({ text, language, voice, speed, useFallback });
    
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('X-TTS-Engine', ttsResult.engine);
    return res.send(ttsResult.audio);
  } catch (err) {
    console.error('Voice TTS error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Memory endpoints (optional)
async function getMemory(req, res) {
  try {
    const { userId } = req.params;
    const context = await MemoryManager.getContext(userId);
    return res.status(200).json({ success: true, ...context });
  } catch (err) {
    console.error('Get memory error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function clearMemory(req, res) {
  try {
    const { userId } = req.params;
    await MemoryManager.clearConversation(userId);
    return res.status(200).json({ success: true, message: 'Memory cleared' });
  } catch (err) {
    console.error('Clear memory error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { generate, tts, getMemory, clearMemory };
