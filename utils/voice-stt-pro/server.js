const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const express = require('express');

const { preprocessAudio }        = require('./audioPreprocess');
const { transcribeFusionFull }   = require('./sttFusion');
const { postProcessWithMistral } = require('./mistralPostProcess');
const { VadSession }             = require('./vadHandler');

function initSTTPro(httpServer, expressApp) {
  // Serve STT Pro frontend at /stt-pro
  expressApp.use('/stt-pro', express.static(path.join(__dirname, '../../public/stt-pro')));

  // WebSocket server attached to existing http server
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws/stt-pro' });

  wss.on('connection', (ws) => {
    const sessionId   = uuidv4();
    const audioChunks = [];
    const vadSession  = new VadSession();
    let isProcessing  = false;

    console.log(`[STT Pro] New WebSocket connection: ${sessionId}`);

    // Send ready message to client
    ws.send(JSON.stringify({ type: 'ready', sessionId }));

    ws.on('message', async (data) => {
      try {
        if (typeof data === 'string') {
          // Handle JSON control messages
          const message = JSON.parse(data);

          if (message.type === 'end_stream' && !isProcessing) {
            isProcessing = true;
            // Accept optional per-connection overrides from client
            await processFinalTranscription(
              ws, audioChunks, vadSession,
              message.strategy,
              message.language   // e.g. 'fr', 'ar', 'auto', 'en'
            );
          } else if (message.type === 'cancel') {
            ws.send(JSON.stringify({ type: 'cancelled' }));
            audioChunks.length = 0;
            vadSession.reset();
            isProcessing = false;
          }
        } else {
          // Handle binary audio chunks
          audioChunks.push(data);
          const partialText = vadSession.processChunk(data);
          if (partialText) {
            ws.send(JSON.stringify({ type: 'partial', text: partialText }));
          }
        }
      } catch (err) {
        console.error('[STT Pro] WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      console.log(`[STT Pro] WebSocket closed: ${sessionId}`);
      vadSession.free();
    });

    async function processFinalTranscription(ws, chunks, vad, strategy, language = 'en') {
      isProcessing = true;
      const startTime = Date.now();

      try {
        ws.send(JSON.stringify({ type: 'processing', stage: 'Cleaning audio...' }));
        const rawBuffer   = Buffer.concat(chunks);
        const cleanBuffer = await preprocessAudio(rawBuffer);

        const langLabel = language === 'auto' ? 'auto-detect' : (language || 'en').toUpperCase();
        ws.send(JSON.stringify({ type: 'processing', stage: `Transcribing [${langLabel}] (Vosk + Whisper)...` }));

        const sttResult = await transcribeFusionFull(cleanBuffer, { strategy, language });

        ws.send(JSON.stringify({ type: 'processing', stage: 'Refining text...' }));
        // Pass detected/resolved language to post-processor so it fixes in right language
        const resolvedLang = sttResult.detectedLanguage || sttResult.language || 'en';
        const finalText = await postProcessWithMistral(sttResult.text, resolvedLang);

        const elapsed = Date.now() - startTime;

        ws.send(JSON.stringify({
          type: 'final',
          text: finalText,
          raw:  sttResult.text,
          sessionId,
          elapsed,
          language:         sttResult.language         || language,
          languageName:     sttResult.languageName     || '',
          detectedLanguage: sttResult.detectedLanguage || null,
          // Full STT telemetry — same shape as REST /api/stt/speak
          sttMeta: {
            engine:           sttResult.engine,
            strategy:         sttResult.strategy,
            language:         sttResult.language,
            detectedLanguage: sttResult.detectedLanguage,
            languageName:     sttResult.languageName,
            confidence:       parseFloat(sttResult.confidence.toFixed(4)),
            latency: {
              vosk:    sttResult.latency.vosk,
              whisper: sttResult.latency.whisper,
              total:   sttResult.latency.total
            }
          }
        }));

      } catch (err) {
        console.error('[STT Pro] Processing error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Transcription failed' }));
      } finally {
        audioChunks.length = 0;
        vad.reset();
        isProcessing = false;
      }
    }
  });

  console.log('[STT Pro] Initialized — Vosk + Whisper Fusion (Multilanguage) Active');
  return wss;
}

module.exports = { initSTTPro };
