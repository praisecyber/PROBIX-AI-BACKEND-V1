class STTClient {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.scriptProcessor = null;
    this.analyser = null;
    this.isRecording = false;
    this.sessionId = null;
    this.lastSpeechTime = null;
    this.silenceTimeout = null;
    this.history = [];
    this.SILENCE_THRESHOLD = 0.01;
    this.SILENCE_TIMEOUT_MS = 1500;

    this.elements = {
      statusText: document.getElementById('statusText'),
      recordBtn: document.getElementById('recordBtn'),
      clearBtn: document.getElementById('clearBtn'),
      partialText: document.getElementById('partialText'),
      finalText: document.getElementById('finalText'),
      latency: document.getElementById('latency'),
      historyList: document.getElementById('historyList'),
      waveform: document.getElementById('waveform'),
      stages: {
        vad: document.getElementById('stage-vad'),
        ffmpeg: document.getElementById('stage-ffmpeg'),
        vosk: document.getElementById('stage-vosk'),
        whisper: document.getElementById('stage-whisper'),
        mistral: document.getElementById('stage-mistral'),
        output: document.getElementById('stage-output')
      }
    };

    this.canvasCtx = this.elements.waveform.getContext('2d');

    this.connect();
    this.bindEvents();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.updateStatus('Ready');
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      this.handleServerMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      this.updateStatus('Disconnected - Reconnecting...');
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  bindEvents() {
    this.elements.recordBtn.addEventListener('click', () => this.toggleRecording());
    this.elements.clearBtn.addEventListener('click', () => this.clearAll());
  }

  updateStatus(text) {
    this.elements.statusText.textContent = text;
  }

  resetStages() {
    Object.values(this.elements.stages).forEach(stage => {
      stage.classList.remove('active', 'complete');
    });
  }

  setStageActive(stageName) {
    this.elements.stages[stageName]?.classList.add('active');
  }

  setStageComplete(stageName) {
    this.elements.stages[stageName]?.classList.remove('active');
    this.elements.stages[stageName]?.classList.add('complete');
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create analyser for waveform visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.visualizeWaveform();

      // Create script processor (deprecated, but widely supported)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => this.handleAudioProcess(e);

      this.sourceNode.connect(this.analyser);
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.elements.recordBtn.textContent = 'STOP RECORDING';
      this.elements.recordBtn.classList.add('recording');
      this.updateStatus('Recording');
      this.elements.partialText.textContent = '';
      this.lastSpeechTime = Date.now();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      this.updateStatus('Error: Could not access microphone');
    }
  }

  stopRecording() {
    this.isRecording = false;
    this.elements.recordBtn.textContent = 'RECORD';
    this.elements.recordBtn.classList.remove('recording');
    this.updateStatus('Processing');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end_stream' }));
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    clearTimeout(this.silenceTimeout);
  }

  handleAudioProcess(event) {
    if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const inputBuffer = event.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);

    // Compute RMS for client-side VAD
    const rms = this.computeRMS(inputData);

    if (rms > this.SILENCE_THRESHOLD) {
      this.lastSpeechTime = Date.now();
      clearTimeout(this.silenceTimeout);
      // Convert Float32 to Int16 PCM and send
      const int16Buffer = this.float32ToInt16(inputData);
      this.ws.send(int16Buffer);
    } else {
      // Check for silence timeout
      if (Date.now() - this.lastSpeechTime > this.SILENCE_TIMEOUT_MS) {
        this.stopRecording();
      }
    }
  }

  computeRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  float32ToInt16(buffer) {
    const int16Array = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i];
      const s = Math.max(-1, Math.min(1, sample));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
  }

  visualizeWaveform() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const width = this.elements.waveform.width;
    const height = this.elements.waveform.height;

    const draw = () => {
      requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      this.canvasCtx.fillStyle = '#010409';
      this.canvasCtx.fillRect(0, 0, width, height);

      const barWidth = (width / 48) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < 48; i++) {
        barHeight = (dataArray[i] / 255) * height;
        this.canvasCtx.fillStyle = `rgb(${barHeight + 100}, 150, 255)`;
        this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'ready':
        this.sessionId = msg.sessionId;
        this.updateStatus('Ready');
        break;
      case 'partial':
        this.elements.partialText.textContent = msg.text;
        this.setStageActive('vad');
        break;
      case 'processing':
        this.updateStatus(msg.stage);
        if (msg.stage.includes('Cleaning')) this.setStageActive('ffmpeg');
        if (msg.stage.includes('Transcribing')) {
          this.setStageComplete('ffmpeg');
          this.setStageActive('vosk');
          this.setStageActive('whisper');
        }
        if (msg.stage.includes('Refining')) {
          this.setStageComplete('vosk');
          this.setStageComplete('whisper');
          this.setStageActive('mistral');
        }
        break;
      case 'final':
        this.elements.finalText.textContent = msg.text;
        this.elements.latency.textContent = `Latency: ${msg.elapsed}ms`;
        this.elements.partialText.textContent = 'Partial text will appear here...';
        this.setStageComplete('mistral');
        this.setStageComplete('output');
        this.addToHistory(msg.text);
        this.updateStatus('Ready');
        break;
      case 'error':
        this.updateStatus('Error: ' + msg.message);
        break;
      case 'cancelled':
        this.updateStatus('Cancelled');
        this.elements.partialText.textContent = 'Partial text will appear here...';
        break;
    }
  }

  addToHistory(text) {
    const now = new Date().toLocaleString();
    this.history.unshift({ text, time: now });
    if (this.history.length > 10) {
      this.history.pop();
    }
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history
      .map(item => `
        <div class="historyItem">
          <div class="historyTimestamp">${item.time}</div>
          <div>${item.text}</div>
        </div>
      `)
      .join('');
  }

  clearAll() {
    this.elements.partialText.textContent = 'Partial text will appear here...';
    this.elements.finalText.textContent = 'Final text will appear here...';
    this.elements.latency.textContent = '';
    this.history = [];
    this.renderHistory();
    this.resetStages();
  }
}

// Initialize the STT client when the page loads
window.addEventListener('DOMContentLoaded', () => {
  new STTClient();
});
