// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const IS_LOCAL_FILE = location.protocol === 'file:';
const BASE = IS_LOCAL_FILE ? '' : window.location.origin;
let SERVER_AVAILABLE = true;

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function getToken() {
  return document.getElementById('jwt-token').value.trim();
}

function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

let toastTimer;
function toast(msg, type = 'info', duration = 3500) {
  const el = document.getElementById('toast');
  el.innerHTML = (type==='success'?'✅':type==='error'?'❌':'ℹ️') + ' ' + msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', duration);
}

function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'status') loadStatus();
}

// ═══════════════════════════════════════════════════════════════
//  SERVER HEALTH
// ═══════════════════════════════════════════════════════════════
async function checkServerHealth() {
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (r.ok) {
      document.getElementById('server-dot').style.background = 'var(--green)';
      document.getElementById('server-dot').style.boxShadow = '0 0 8px var(--green)';
      document.getElementById('server-status-text').textContent = 'Server Online';
    } else {
      document.getElementById('server-dot').style.background = 'var(--orange)';
      document.getElementById('server-status-text').textContent = 'Server Warning';
    }
  } catch {
    document.getElementById('server-dot').style.background = 'var(--red)';
    document.getElementById('server-dot').style.boxShadow = '0 0 8px var(--red)';
    document.getElementById('server-status-text').textContent = 'Server Offline';
  }
}
if (!IS_LOCAL_FILE) {
  checkServerHealth();
  setInterval(checkServerHealth, 10000);
} else {
  // Running from file:// — run in offline/demo mode
  SERVER_AVAILABLE = false;
  document.getElementById('server-dot').style.background = 'var(--red)';
  document.getElementById('server-dot').style.boxShadow = '0 0 8px var(--red)';
  document.getElementById('server-status-text').textContent = 'Local Demo (no server)';
  toast('Running in offline demo mode — server unavailable', 'info', 4000);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
function checkAuth() {
  const t = getToken();
  const el = document.getElementById('auth-status');
  if (!t) { el.textContent = 'No token set'; el.className = 'auth-status'; return; }
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    const exp = payload.exp ? new Date(payload.exp * 1000) : null;
    if (exp && exp < new Date()) {
      el.textContent = '⚠️ Token expired'; el.className = 'auth-status'; return;
    }
    el.textContent = `✓ Token OK — user: ${payload.id || payload.userId || payload.email || 'unknown'}`;
    el.className = 'auth-status ok';
    toast('Token verified!', 'success');
  } catch {
    el.textContent = '⚠️ Invalid token format';
    el.className = 'auth-status';
  }
}

function showQuickLogin() {
  document.getElementById('login-modal').style.display = 'flex';
}
function closeLoginModal() {
  document.getElementById('login-modal').style.display = 'none';
}
async function doLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-action-btn');
  const msg = document.getElementById('login-msg');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Logging in...';
  msg.textContent = '';

  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    const token = data.token || data.accessToken || data.data?.token;
    if (token) {
      document.getElementById('jwt-token').value = token;
      checkAuth();
      closeLoginModal();
      toast('Logged in successfully!', 'success');
    } else {
      msg.style.color = 'var(--red)';
      msg.textContent = data.message || data.error || 'Login failed';
    }
  } catch (e) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Network error: ' + e.message;
  }

  btn.disabled = false;
  btn.innerHTML = 'Login & Get Token';
}

// ═══════════════════════════════════════════════════════════════
//  VOICE RECORDING
// ═══════════════════════════════════════════════════════════════
let mediaRecorder = null;
let audioChunks   = [];
let recordStream  = null;
let analyser      = null;
let animFrame     = null;
let recordStart   = null;
let timerInterval = null;

const canvas = document.getElementById('waveform-canvas');
const ctx2d  = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawWaveform(dataArray) {
  resizeCanvas();
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  ctx2d.fillStyle = '#0d1526';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);

  const sliceW = canvas.width / dataArray.length;
  ctx2d.beginPath();
  ctx2d.strokeStyle = '#6366f1';
  ctx2d.lineWidth = 2;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * canvas.height / 2;
    i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
    x += sliceW;
  }
  ctx2d.stroke();
}

function drawIdle() {
  resizeCanvas();
  ctx2d.fillStyle = '#0d1526';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  ctx2d.strokeStyle = 'rgba(99,102,241,0.2)';
  ctx2d.lineWidth = 1.5;
  ctx2d.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    const y = canvas.height / 2 + Math.sin(x * 0.05) * 4;
    x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
  }
  ctx2d.stroke();
}
drawIdle();

function startVisualizer(stream) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source   = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    animFrame = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    drawWaveform(dataArray);

    // Volume bar
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += Math.abs(dataArray[i] - 128);
    const vol = Math.min(100, (sum / dataArray.length) * 3);
    document.getElementById('vol-fill').style.width = vol + '%';
  }
  draw();
}

function stopVisualizer() {
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  document.getElementById('vol-fill').style.width = '0%';
  drawIdle();
}

async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function checkAndUpdateMicStatus() {
  const troubleshootingDiv = document.getElementById('mic-troubleshooting');
  try {
    // Try to get user media first to unlock device labels
    let tempStream;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.log('Could not get temporary audio stream for device labels:', e);
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    console.log('Available audio inputs:', audioInputs);

    if (tempStream) {
      tempStream.getTracks().forEach(track => track.stop());
    }

    if (audioInputs.length === 0) {
      troubleshootingDiv.style.display = 'block';
      return false;
    } else {
      troubleshootingDiv.style.display = 'none';
      return true;
    }
  } catch (e) {
    troubleshootingDiv.style.display = 'block';
    console.error('Error checking mic status:', e);
    return false;
  }
}

async function startRecording() {
  const hasMic = await checkAndUpdateMicStatus();
  if (!hasMic) {
    toast('⚠️ No microphone detected! Please follow the troubleshooting steps.', 'error', 7000);
    return;
  }

  try {
    recordStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        sampleRate: 16000, 
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    startVisualizer(recordStream);

    mediaRecorder = new MediaRecorder(recordStream, { mimeType: 'audio/webm' });
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = () => {
      document.getElementById('send-voice-btn').disabled = false;
    };

    mediaRecorder.start(100);
    recordStart = Date.now();

    const btn = document.getElementById('record-btn');
    btn.classList.add('recording');
    btn.innerHTML = '⏹ Stop Recording';

    setStage('record', 'active');
    document.getElementById('record-timer').textContent = 'Recording: 0s';
    timerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - recordStart) / 1000);
      document.getElementById('record-timer').textContent = `Recording: ${s}s`;
    }, 1000);

    toast('Recording started — speak now!', 'info');
  } catch (e) {
    let msg;
    if (e.name === 'NotFoundError') {
      msg = 'Microphone not found — please check if your microphone is connected and enabled.';
    } else if (e.name === 'NotAllowedError') {
      msg = 'Microphone permission denied — please allow microphone access in your browser.';
    } else if (e.name === 'NotReadableError') {
      msg = 'Microphone is in use by another application — please close other apps using your mic and try again.';
    } else {
      msg = `Microphone error (${e.name}): ${e.message}`;
    }
    console.error('Microphone error details:', e);
    toast(msg, 'error', 7000);
  }
}

function stopRecording() {
  if (mediaRecorder) { mediaRecorder.stop(); }
  if (recordStream)  { recordStream.getTracks().forEach(t => t.stop()); }
  stopVisualizer();
  clearInterval(timerInterval);

  const btn = document.getElementById('record-btn');
  btn.classList.remove('recording');
  btn.innerHTML = '⏺ Start Recording';

  setStage('record', 'done');
  const s = Math.floor((Date.now() - recordStart) / 1000);
  document.getElementById('record-timer').textContent = `✓ Recorded ${s}s — ready to send`;
  toast(`Recorded ${s}s of audio`, 'success');
}

async function sendVoiceToAI() {
  if (!audioChunks.length) { toast('No audio recorded', 'error'); return; }

  const token = getToken();
  // Only require JWT when communicating with a real server
  if (SERVER_AVAILABLE && !token) { toast('⚠️ JWT token required for voice endpoint — login first', 'error'); return; }

  const btn = document.getElementById('send-voice-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Processing...';

  setStage('stt', 'active');

  try {

    // If server is unavailable, run a local demo: show transcript placeholder and synthesize AI reply
    if (!SERVER_AVAILABLE) {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const transcriptEl = document.getElementById('v2v-transcript');
      transcriptEl.textContent = '(local demo) Recorded audio ready — playing simulated AI response.';
      transcriptEl.classList.remove('empty');

      setStage('stt', 'done');
      setStage('ai', 'active');

      const aiText = 'Hello — this is a local demo response. I received your audio.';
      const aiEl = document.getElementById('v2v-ai-response');
      aiEl.textContent = aiText;
      aiEl.classList.remove('empty');
      document.getElementById('v2v-ai-meta').innerHTML = `<span class="meta-tag model">model: local-sim</span>`;
      document.getElementById('v2v-tts-row').style.display = 'flex';

      // speak using browser TTS
      try {
        const u = new SpeechSynthesisUtterance(aiText);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        toast('Played simulated AI response (offline)', 'success');
      } catch (e) {
        toast('SpeechSynthesis not available: ' + e.message, 'error');
      }

      setStage('ai', 'done');
      setStage('out', 'done');
      audioChunks = [];
      btn.disabled = false;
      btn.innerHTML = '🚀 Send to AI';
      return;
    }

    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const wavBlob = await convertToWav(blob);

    const formData = new FormData();
    formData.append('audio', wavBlob, 'recording.wav');

    const lang = document.getElementById('v2v-lang').value;
    const strat = document.getElementById('v2v-strategy').value;
    if (lang) formData.append('language', lang);
    if (strat) formData.append('strategy', strat);

    const r = await fetch(`${BASE}/api/stt/speak`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });

    setStage('stt', 'done');
    setStage('ai', 'active');

    const data = await r.json();

    if (!r.ok) {
      toast(data.message || 'STT failed', 'error');
      resetStages(); return;
    }

    // Show transcript
    const transcriptEl = document.getElementById('v2v-transcript');
    transcriptEl.textContent = data.userText || '(empty)';
    transcriptEl.classList.remove('empty');

    // STT meta
    if (data.sttMeta) {
      const m = data.sttMeta;
      document.getElementById('v2v-stt-meta').innerHTML = `
        <span class="meta-tag engine">engine: ${m.engine}</span>
        <span class="meta-tag lang">lang: ${m.languageName || m.language}</span>
        <span class="meta-tag conf">conf: ${(m.confidence * 100).toFixed(1)}%</span>
        <span class="meta-tag latency">vosk: ${m.latency?.vosk || 0}ms | whisper: ${m.latency?.whisper || 0}ms</span>
      `;
    }

    // AI response
    setStage('ai', 'done');
    setStage('out', 'active');

    const aiEl = document.getElementById('v2v-ai-response');
    const responseText = data.response || '(no response)';
    aiEl.textContent = responseText;
    aiEl.classList.remove('empty');

    if (!data.response) {
      const errorMsg = data.aiError || data.message || 'AI did not return a response. Please check the model servers or API fallback.';
      toast(errorMsg, 'error', 7000);
    }

    document.getElementById('v2v-ai-meta').innerHTML = `
      <span class="meta-tag model">model: ${data.model || 'merge'}</span>
      <span class="meta-tag lang">lang: ${data.languageName || data.language || 'en'}</span>
      <span class="meta-tag topic">topic: ${data.topic || 'general'}</span>
    `;

    setStage('out', 'done');
    if (data.response) {
      document.getElementById('v2v-tts-row').style.display = 'flex';
      toast('Voice processed successfully!', 'success');
      // Auto-play the AI response
      playAIResponse();
    } else {
      document.getElementById('v2v-tts-row').style.display = 'none';
    }
    audioChunks = [];

  } catch (e) {
    toast('Error: ' + e.message, 'error');
    resetStages();
  }

  btn.disabled = false;
  btn.innerHTML = '🚀 Send to AI';
}

async function playAIResponse() {
  const text = document.getElementById('v2v-ai-response').textContent;
  if (!text || text === '(no response)') return;
  const btn = document.getElementById('play-ai-btn');
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;
  try {
    if (!SERVER_AVAILABLE) {
      // Use browser TTS for offline/demo mode
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      toast('Playing AI response (local TTS)', 'success');
    } else {
      const r = await fetch(`${BASE}/api/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en', speed: 1.0 })
      });
      if (!r.ok) throw new Error('TTS failed');
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const audio = document.getElementById('v2v-audio');
      audio.src = url;
      audio.style.display = 'block';
      audio.controls = true;
      // Try to auto-play
      audio.play().then(() => {
        toast('Playing AI response!', 'success');
      }).catch(err => {
        console.warn('Auto-play blocked by browser: user must click play button', err);
        toast('Click "🔊 Play Response" to hear the audio', 'info', 5000);
      });
    }
  } catch (e) {
    toast('TTS error: ' + e.message, 'error');
  }
  btn.innerHTML = '🔊 Play Response';
  btn.disabled = false;
}

// Stage helpers
function setStage(id, state) {
  const el = document.getElementById(`stg-${id}`);
  if (!el) return;
  el.className = 'stage ' + state;
}
function resetStages() {
  ['record','stt','ai','out'].forEach(s => document.getElementById(`stg-${s}`).className = 'stage');
}

// WAV conversion from WebM using Web Audio API
async function convertToWav(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const decoded  = await audioCtx.decodeAudioData(arrayBuf);

  const numChannels = 1;
  const sr   = 16000;
  const samples = decoded.getChannelData(0);

  // Resample if needed
  let pcmData;
  if (decoded.sampleRate !== sr) {
    const ratio = decoded.sampleRate / sr;
    const length = Math.floor(samples.length / ratio);
    pcmData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      pcmData[i] = samples[Math.floor(i * ratio)];
    }
  } else {
    pcmData = samples;
  }

  // Float32 → Int16
  const int16 = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
  }

  // Build WAV
  const wavBuf = new ArrayBuffer(44 + int16.buffer.byteLength);
  const view   = new DataView(wavBuf);
  function writeStr(offset, s) { for (let i=0;i<s.length;i++) view.setUint8(offset+i, s.charCodeAt(i)); }
  writeStr(0, 'RIFF');
  view.setUint32(4,  36 + int16.buffer.byteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12,'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1,  true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2,  true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, int16.buffer.byteLength, true);
  new Int16Array(wavBuf, 44).set(int16);

  return new Blob([wavBuf], { type: 'audio/wav' });
}

// ═══════════════════════════════════════════════════════════════
//  AI BRAIN
// ═══════════════════════════════════════════════════════════════
let brainHistory = [];

async function sendToBrain() {
  const prompt    = document.getElementById('brain-prompt').value.trim();
  const model     = document.getElementById('brain-model').value;
  const userId    = document.getElementById('brain-userid').value.trim();
  const maxTokens = parseInt(document.getElementById('brain-maxtokens').value) || 1024;
  const temp      = parseFloat(document.getElementById('brain-temp').value) || 0.7;

  if (!prompt) { toast('Enter a prompt first', 'error'); return; }

  const btn = document.getElementById('brain-send-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Thinking...';

  // Add user bubble
  addChatBubble('user', prompt);
  document.getElementById('brain-prompt').value = '';

  // Show loading in raw
  const rawEl = document.getElementById('brain-raw-response');
  rawEl.textContent = 'Generating response...';
  rawEl.classList.remove('empty');
  document.getElementById('brain-fusion-card').style.display = 'none';

  const t0 = Date.now();

  try {
    // If server is not available, simulate a local response
    let data;
    let r;
    if (!SERVER_AVAILABLE) {
      const simulated = `(local demo) Echo: ${prompt}`;
      data = { response: simulated, model: 'local-sim', topic: 'demo' };
    } else {
      r = await fetch(`${BASE}/api/voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: brainHistory,
          model,
          userId: userId || undefined,
          max_tokens: maxTokens,
          temperature: temp,
          useMemory: !!userId
        })
      });

      data = await r.json();
      if (!r.ok) {
        toast(data.message || 'AI error', 'error');
        rawEl.textContent = data.message || 'Error';
        btn.disabled = false;
        btn.innerHTML = '🚀 Send to AI Brain';
        return;
      }
    }
    const elapsed = Date.now() - t0;

    const finalResponse = data.response || data.merged || '(empty)';
    rawEl.textContent = finalResponse;

    document.getElementById('brain-meta-row').innerHTML = `
      <span class="meta-tag model">model: ${data.model || model}</span>
      <span class="meta-tag latency">⏱ ${elapsed}ms</span>
      ${data.topic ? `<span class="meta-tag topic">topic: ${data.topic}</span>` : ''}
    `;

    // Fusion details
    if (data.mistral && data.gemma) {
      document.getElementById('brain-fusion-card').style.display = 'block';
      document.getElementById('brain-mistral-out').textContent = data.mistral;
      document.getElementById('brain-gemma-out').textContent   = data.gemma;
    }

    // Add to local history & chat
    brainHistory.push({ role: 'user', content: prompt });
    brainHistory.push({ role: 'assistant', content: finalResponse });
    if (brainHistory.length > 20) brainHistory = brainHistory.slice(-20);
    addChatBubble('ai', finalResponse);

    // If running in offline/demo mode, speak the response using browser TTS
    if (!SERVER_AVAILABLE) {
      try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(finalResponse)); }
      catch(e) { /* ignore */ }
    }

    document.getElementById('brain-model-label').innerHTML = `<span>MODEL: ${(data.model || model).toUpperCase()}</span>`;
    toast('AI responded!', 'success');

  } catch (e) {
    toast('Error: ' + e.message, 'error');
    rawEl.textContent = 'Error: ' + e.message;
  }

  btn.disabled = false;
  btn.innerHTML = '🚀 Send to AI Brain';
}

function addChatBubble(role, text) {
  const hist = document.getElementById('brain-chat-history');
  // Remove empty state
  const empty = hist.querySelector('.empty-state');
  if (empty) empty.remove();

  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.innerHTML = `
    <div class="chat-avatar">${role === 'user' ? 'U' : '🤖'}</div>
    <div class="chat-bubble">${escHtml(text)}</div>
  `;
  hist.appendChild(msg);
  hist.scrollTop = hist.scrollHeight;
}

function clearBrainChat() {
  brainHistory = [];
  document.getElementById('brain-chat-history').innerHTML = `
    <div class="empty-state"><div class="empty-icon">🤖</div><div>Start a conversation with the AI Brain</div></div>`;
  document.getElementById('brain-raw-response').textContent = 'Raw AI output will appear here...';
  document.getElementById('brain-raw-response').classList.add('empty');
  document.getElementById('brain-fusion-card').style.display = 'none';
  document.getElementById('brain-meta-row').innerHTML = '';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// Enter key to send
document.getElementById('brain-prompt').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendToBrain();
});

// ═══════════════════════════════════════════════════════════════
//  TTS
// ═══════════════════════════════════════════════════════════════
async function doTTS() {
  const text       = document.getElementById('tts-text').value.trim();
  const lang       = document.getElementById('tts-lang').value;
  const speed      = parseFloat(document.getElementById('tts-speed').value) || 1.0;
  const voice      = document.getElementById('tts-voice').value.trim() || undefined;
  const useFallback= document.getElementById('tts-fallback').checked;

  if (!text) { toast('Enter text first', 'error'); return; }

  const btn = document.getElementById('tts-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Generating...';

  try {
    const r = await fetch(`${BASE}/api/voice/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang, speed, voice, useFallback })
    });

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || `HTTP ${r.status}`);
    }

    const engine = r.headers.get('X-TTS-Engine') || 'unknown';
    const blob   = await r.blob();
    const url    = URL.createObjectURL(blob);

    document.getElementById('tts-result-empty').style.display = 'none';
    document.getElementById('tts-result').style.display = 'block';

    const audio = document.getElementById('tts-audio');
    audio.src = url;
    audio.play();

    document.getElementById('tts-download').href = url;
    document.getElementById('tts-meta').innerHTML = `
      <span class="meta-tag engine">engine: ${engine}</span>
      <span class="meta-tag lang">lang: ${lang}</span>
      <span class="meta-tag latency">speed: ${speed}x</span>
    `;

    toast(`TTS generated via ${engine}!`, 'success');
  } catch (e) {
    toast('TTS error: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔊 Generate Speech';
}

function quickTTS(text, lang) {
  document.getElementById('tts-text').value = text;
  document.getElementById('tts-lang').value = lang;
  doTTS();
}

// ═══════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════
async function loadStatus() {
  const cont = document.getElementById('status-content');
  cont.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div>Loading...</div></div>';

  // STT status
  try {
    const r = await fetch(`${BASE}/api/stt/status`);
    const data = await r.json();
    const s = data.sttEngine || {};

    cont.innerHTML = `
      <div class="section-title">STT Engine Configuration</div>
      <div class="status-grid" style="margin-bottom:20px;">
        <div class="status-item">
          <div class="s-label">Mode</div>
          <div class="s-value s-ok">${s.mode || 'unknown'}</div>
        </div>
        <div class="status-item">
          <div class="s-label">Strategy</div>
          <div class="s-value">${s.defaultStrategy || 'parallel'}</div>
        </div>
        <div class="status-item">
          <div class="s-label">Smart Auto Threshold</div>
          <div class="s-value">${s.smartAutoThreshold || 0.5}</div>
        </div>
        <div class="status-item">
          <div class="s-label">Whisper Timeout</div>
          <div class="s-value">${s.whisperTimeoutMs || 2500}ms</div>
        </div>
        <div class="status-item">
          <div class="s-label">Whisper EN (tiny.en)</div>
          <div class="s-value ${s.whisperEn?.available ? 's-ok' : 's-err'}">
            ${s.whisperEn?.available ? '✅ Available' : '❌ Not Found'}
          </div>
        </div>
        <div class="status-item">
          <div class="s-label">Whisper Multilingual</div>
          <div class="s-value ${s.whisperMultilingual?.available ? 's-ok' : 's-warn'}">
            ${s.whisperMultilingual?.available ? '✅ Available (99 langs)' : '⚠️ Not Found'}
          </div>
        </div>
      </div>
      <div class="section-title">Vosk Model Status</div>
      <div class="status-grid">
        ${Object.entries(s.vosk?.models || {}).map(([lang, info]) => `
          <div class="status-item">
            <div class="s-label">${info.language} (${lang})</div>
            <div class="s-value ${info.installed ? 's-ok' : 's-err'}">
              ${info.installed ? '✅ Installed' : '❌ Not installed'}
              ${info.loaded ? ' · Loaded' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    cont.innerHTML = `<div class="empty-state"><div>⚠️ Could not load STT status: ${e.message}</div></div>`;
  }

  // Health grid
  const endpoints = [
    { name: 'API Root',        url: '/' },
    { name: 'Health Check',    url: '/api/health' },
    { name: 'STT Status',      url: '/api/stt/status' },
    { name: 'API Docs',        url: '/api-docs' },
  ];

  const grid = document.getElementById('health-grid');
  grid.innerHTML = '';

  for (const ep of endpoints) {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.innerHTML = `<div class="s-label">${ep.name}</div><div class="s-value s-warn">Checking...</div>`;
    grid.appendChild(item);

    fetch(`${BASE}${ep.url}`).then(r => {
      item.innerHTML = `
        <div class="s-label">${ep.name}</div>
        <div class="s-value ${r.ok ? 's-ok' : 's-err'}">${r.ok ? '✅ ' + r.status : '❌ ' + r.status}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">${ep.url}</div>
      `;
    }).catch(() => {
      item.innerHTML = `
        <div class="s-label">${ep.name}</div>
        <div class="s-value s-err">❌ Unreachable</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">${ep.url}</div>
      `;
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  MEMORY
// ═══════════════════════════════════════════════════════════════
async function loadMemory() {
  const userId = document.getElementById('mem-userid').value.trim();
  if (!userId) { toast('Enter a user ID', 'error'); return; }

  try {
    const r = await fetch(`${BASE}/api/voice/memory/${userId}`);
    const data = await r.json();

    // Profile
    const profileEl = document.getElementById('mem-profile');
    profileEl.textContent = JSON.stringify(data.profile || {}, null, 2);
    profileEl.classList.remove('empty');

    // History
    const hist = document.getElementById('mem-history');
    const conv  = data.conversation || [];
    if (!conv.length) {
      hist.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div>No conversation history yet</div></div>';
      return;
    }
    hist.innerHTML = conv.map(m => `
      <div class="memory-entry">
        <span class="memory-role ${m.role}">${m.role}</span>
        <span class="memory-text">${escHtml(m.content || '')}</span>
        <span class="memory-ts">${new Date(m.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');
    toast(`Loaded ${conv.length} messages`, 'success');
  } catch (e) {
    toast('Memory error: ' + e.message, 'error');
  }
}

async function clearMemory() {
  const userId = document.getElementById('mem-userid').value.trim();
  if (!userId) { toast('Enter a user ID', 'error'); return; }
  try {
    await fetch(`${BASE}/api/voice/memory/${userId}`, { method: 'DELETE' });
    document.getElementById('mem-history').innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div>Memory cleared</div></div>';
    document.getElementById('mem-profile').textContent = 'Profile will appear here...';
    document.getElementById('mem-profile').classList.add('empty');
    toast('Memory cleared!', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

function initProbixTest() {
  document.getElementById('auth-verify-btn').addEventListener('click', checkAuth);
  document.getElementById('auth-quick-login-btn').addEventListener('click', showQuickLogin);
  document.getElementById('login-action-btn').addEventListener('click', doLogin);
  document.getElementById('login-cancel-btn').addEventListener('click', closeLoginModal);
  document.getElementById('tab-voice').addEventListener('click', () => switchTab('voice'));
  document.getElementById('tab-brain').addEventListener('click', () => switchTab('brain'));
  document.getElementById('tab-tts').addEventListener('click', () => switchTab('tts'));
  document.getElementById('tab-status').addEventListener('click', () => switchTab('status'));
  document.getElementById('tab-memory').addEventListener('click', () => switchTab('memory'));
  document.getElementById('record-btn').addEventListener('click', toggleRecording);
  document.getElementById('send-voice-btn').addEventListener('click', sendVoiceToAI);
  document.getElementById('play-ai-btn').addEventListener('click', playAIResponse);
  document.getElementById('brain-send-btn').addEventListener('click', sendToBrain);
  document.getElementById('brain-clear-btn').addEventListener('click', clearBrainChat);
  document.getElementById('tts-btn').addEventListener('click', doTTS);
  document.getElementById('status-refresh-btn').addEventListener('click', loadStatus);
  document.getElementById('memory-load-btn').addEventListener('click', loadMemory);
  document.getElementById('memory-clear-btn').addEventListener('click', clearMemory);
  document.querySelectorAll('.quick-tts').forEach(button => {
    button.addEventListener('click', () => quickTTS(button.dataset.text, button.dataset.lang));
  });
  document.getElementById('brain-prompt').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendToBrain();
  });
  
  // Re-check microphones button
  document.getElementById('recheck-mic-btn').addEventListener('click', async () => {
    const hasMic = await checkAndUpdateMicStatus();
    if (hasMic) {
      toast('✅ Microphone detected! Click "Start Recording" to begin.', 'success');
    } else {
      toast('⚠️ Still no microphone detected — please follow the troubleshooting steps.', 'error');
    }
  });

  // Check mic status on load
  checkAndUpdateMicStatus();
}

document.addEventListener('DOMContentLoaded', initProbixTest);

