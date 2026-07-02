# Probix AI Backend

A comprehensive Node.js / Express backend for Probix AI, featuring: user authentication, waitlist management, multilingual translation, Google Gemini-based STEM tutoring, gamification system, full **Voice-to-Voice AI** (Speech-to-Text + AI + Text-to-Speech), real-time WebSocket STT Pro, and administrative utilities with dashboard.

## Table of Contents
1. [Features](#features)
2. [What this Repo Contains](#what-this-repo-contains)
3. [High-Level Architecture](#high-level-architecture)
4. [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Configuration](#environment-configuration)
    - [Running the Application](#running-the-application)
5. [API Documentation](#api-documentation)
6. [Core Modules](#core-modules)
7. [🎙️ Voice-to-Voice System (Plain English Guide)](#️-voice-to-voice-system-plain-english-guide)
8. [Local Model Servers](#local-model-servers)
9. [AI Models Folder Guide](#ai-models-folder-guide-what-to-keep)
10. [Deployment](#deployment)
    - [Docker](#docker)
    - [PM2](#pm2)
11. [Security](#security)
12. [Notes for Developers](#notes-for-developers)

## Features

### Core Functionality
- **User Authentication & Management**: JWT-based signup/login, password reset, email verification
- **Waitlist System**: User waitlist management with status tracking
- **Multilingual Translation**: NLLB-powered translation across 200+ languages with math verification
- **Gemini STEM Tutoring**: Problem-solving and explanations using Google Gemini API
- **Gamification System**: XP, streaks, levels, leaderboard, and AI-powered success prediction
- **Voice AI**: Text generation (Mistral/Gemma) and Text-to-Speech (Kokoro)
- **🎙️ Voice-to-Voice**: Speak → AI hears → AI thinks → AI speaks back (full STT + AI + TTS pipeline)
- **🔴 Live STT Pro**: Real-time WebSocket speech recognition (Vosk + Whisper dual-engine)
- **Admin Dashboard**: Detailed analytics, request logs, user management, and PIN-based access
- **API Documentation**: Interactive Swagger UI at `/api-docs`

### Technical Features
- **MongoDB**: NoSQL database for data persistence
- **Express Rate Limiting**: Global and per-user rate limiting
- **Cloudflare Support**: Cloudflare header handling for security
- **CORS Configuration**: Customizable allowed origins
- **Health Check Endpoints**: Readiness/liveness probes
- **Docker Compose**: Containerized deployment
- **PM2**: Process manager for production
- **Email Support**: Resend API and SMTP integration

## What this Repo Contains

### Root Files
- `index.js` — Express server setup, middleware, Swagger docs, route registration, graceful shutdown
- `server.js` — Alternative server entry point
- `createAdmin.js` — Admin user creation script
- `package.json` / `package-lock.json` — Dependencies and scripts
- `.env` — Environment variables (not committed)
- `.gitignore` — Git ignore rules
- `Dockerfile` — Docker image definition
- `docker-compose.yml` — Docker Compose services
- `ecosystem.config.js` — PM2 process manager config
- `README.md` — This file!

### Directories
- `config/` — Configuration files (DB, Swagger)
- `controllers/` — Business logic for each feature
- `middleware/` — Express middleware (auth, rate limit, Cloudflare, validators)
- `models/` — Mongoose schemas (User, Waitlist, UserStats, UserRequest, VoiceSession, UserMemory)
- `routes/` — API route definitions
- `utils/` — Helper utilities (email, Gemini client, math service client, templates, voice AI)
- `public/` — Static assets
- `nllb-translator/` — Translation system (NLLB model, math microservice)
- `nlp-predictor-pro/` — Gamification predictive ML model
- `ai_models/` — Local model repositories (Mistral, Gemma, Kokoro)
- `scripts/` — Helper scripts (reorg models, start servers, check health)

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Client Layer                               │
│  (Web/Mobile Apps, API Clients)                                   │
└───────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌───────────────────────────────────────────────────────────────────┐
│                    Express API Gateway                            │
│  • CORS / Rate Limiting  • Cloudflare Headers  • Health Checks    │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                        API Endpoints                               │
│  ┌─────────────┐  ┌───────────┐  ┌──────────────┐  ┌─────────┐  │
│  │ Auth        │  │ Waitlist  │  │ Translation  │  │ Gemini  │  │
│  │ Admin       │  │ Gamifica- │  │ Voice        │  │         │  │
│  └─────────────┘  └───────────┘  └──────────────┘  └─────────┘  │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                       Data & Services                              │
│  ┌──────────────┐  ┌──────────────────────────┐  ┌─────────────┐ │
│  │   MongoDB    │  │ External APIs (Resend,   │  │ Math Micro- │ │
│  │              │  │  Gemini, Cloudflare)     │  │ service     │ │
│  └──────────────┘  └──────────────────────────┘  └─────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │               Local Model Servers (Optional)                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │ Mistral      │  │ Gemma        │  │ Kokoro (TTS) │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js**: 18.x or later
- **MongoDB**: Local or cloud instance (e.g., MongoDB Atlas)
- **Email Provider**: Resend API key or SMTP credentials
- **Google Gemini API Key**: For STEM tutoring
- **Python 3.9+**: Only if using local model servers
- **Git**: For cloning model repositories

### Installation

1. **Clone the repository**:
```bash
git clone <repo-url>
cd probix-ai-backend
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Set up Python virtual environment (for math service and local model servers)**:
   - **Windows**:
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r nllb-translator/math-service/requirements.txt
   ```
   - **Linux/macOS**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r nllb-translator/math-service/requirements.txt
   ```

4. **Download NLLB translation model**:
```bash
npm run nllb:setup
```

### Quick Start for a New PC / Showcase

If you want to run the translation demo on a fresh machine from the private repo, use this flow:

```bash
git clone <repo-url>
cd probix-ai-backend
npm install
npm run nllb:demo
```

If the model cache is already included in the repo, the demo can start directly from the cloned files without re-downloading the translation model. If you are missing the local model files, run:

```bash
npm run nllb:setup
```

For a one-shot setup on a new machine, this also works:

```bash
npm install && npm run nllb:demo
```

### Environment Configuration

Create a `.env` file in the project root with these variables:

```dotenv
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_DB_CONNECTION_STRING=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=*

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-app-password
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL="Probix <onboarding@probix.io>"

# Cloudflare (Optional)
CLOUDFLARE_KEY=

# External Services
MATH_SERVICE_URL=http://localhost:8003
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# Local Model Server URLs (Optional)
MISTRAL_URL=http://localhost:8001
GEMMA_URL=http://localhost:8002
KOKORO_URL=http://localhost:8880

# ElevenLabs (Optional - TTS Fallback)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  # Default voice (optional)
```

### Running the Application

#### Development Mode (with Nodemon)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

## API Documentation

Interactive Swagger UI is available at: `http://localhost:3000/api-docs`

### API Overview

#### Health Endpoints
- `GET /` — Basic server health check
- `GET /api/health` — API health status
- `GET /health` — API health alias
- `GET /healthz` — API health alias (liveness probe)

#### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register a new user
- `POST /api/auth/login` — Login and receive JWT token
- `GET /api/auth/languages` — Get supported UI languages
- `GET /api/auth/me` — Get current authenticated user profile
- `POST /api/auth/forgot-password` — Send password reset code
- `POST /api/auth/verify-reset-code` — Verify password reset code
- `POST /api/auth/reset-password` — Reset user password

#### Admin (`/api/admin`)
- `GET /api/admin/users` — List all users (admin only)
- `GET /api/admin/user?email=user@example.com` — Get user details by email (admin only)
- `GET /api/admin/dashboard/stats` — Get dashboard statistics (admin only)
- `GET /api/admin/dashboard/logs` — Get request logs (admin only)
- `POST /api/admin/verify-pin` — Verify admin dashboard PIN
- `POST /api/admin/create-page` — Initialize admin dashboard page
- `POST /api/admin/send-email` — Send custom email to a user (admin only)
- `GET /api/admin/waitlist` — List all waitlist entries (admin only)
- `DELETE /api/admin/delete-user` — Delete a user by email (admin only)

#### Waitlist (`/api/waitlist`)
- `POST /api/waitlist/join` — Join the waitlist
- `GET /api/waitlist/status?email=user@example.com` — Check waitlist status by email
- `GET /api/waitlist/my-status` — Check waitlist status for authenticated user
- `GET /api/waitlist/count` — Get total number of waitlist entries

#### Translation (`/api/translate`)
- `POST /api/translate` — Translate text using NLLB model
- `GET /api/translate/languages` — Get list of supported NLLB language codes
- `POST /api/translate/verify` — Translate text and verify math expressions
- `POST /api/translate/verify-steps` — Verify individual math step expressions

#### Gemini STEM Tutoring (`/api/gemini`)
- `POST /api/gemini/math` — Solve and explain STEM/math problems using Google Gemini

#### Voice AI (`/api/voice`)
- `POST /api/voice/generate` — Generate text from prompt using Mistral or Gemma
- `POST /api/voice/tts` — Convert text to speech using Kokoro (returns WAV audio)

#### Gamification (`/api/gamification`)
- `POST /api/gamification/complete-quest` — Award XP and streak after a correct action
- `GET /api/gamification/my-stats` — Get current authenticated user's gamification stats
- `GET /api/gamification/leaderboard` — Get top users ranked by streak and XP

## Core Modules

### Authentication
**Files**: `controllers/authController.js`, `middleware/authMiddleware.js`, `routes/authRoutes.js`, `models/User.js`

**Features**:
- User registration with email/password
- Secure JWT token generation and validation
- Password reset flow with verification codes
- Email verification status tracking
- User role management (user/admin)
- Protected routes via Bearer token authentication

### Translation System
**Files**: `nllb-translator/`, `controllers/translateController.js`, `routes/translateRoutes.js`, `utils/mathServiceClient.js`

**Features**:
- NLLB (No Language Left Behind) powered translation
- Supports 200+ languages
- Math expression verification via Python microservice
- Smart dictionary learning from user corrections
- Language listing API

### Gemini STEM Tutoring
**Files**: `controllers/geminiController.js`, `routes/geminiRoutes.js`, `utils/geminiClient.js`

**Features**:
- Google Gemini 3.1 Flash integration
- Math problem solving and step-by-step explanations
- Optional math verification of generated steps
- Per-user rate limiting for Gemini requests

### Voice AI
**Files**: `controllers/voiceController.js`, `routes/voiceRoutes.js`, `utils/voice/`, `models/VoiceSession.js`

**Features**:

#### 1. Mistral Core - Primary Intelligence Engine
- Responsibilities: Reasoning, Tool calling, Coding, Planning, Fast responses, Multi-step tasks
- Output: Draft answer

#### 2. Gemma Core - Quality & Education Engine
- Responsibilities: Clarify explanations, Simplify difficult concepts, Improve readability, Validate responses, Educational formatting
- Output: Refined answer

#### 3. Response Fusion Layer (5-Star Quality!) ⭐⭐⭐⭐⭐
- Responsibilities: Combine outputs from Mistral and Gemma
- Features:
  1. **Topic-Aware Weighting**:
     - Coding questions → prioritize Mistral's technical details
     - Explanation questions → prioritize Gemma's educational clarity
     - General questions → balance both equally
  2. **Intelligent Synthesis**: Uses Mistral itself to merge answers into ONE cohesive response
  3. **Confidence Scoring**: Mistral adds a "CONFIDENCE NOTES" section flagging uncertain parts
  4. **Response Caching**: Caches Mistral/Gemma individual responses for 1 hour; repeat questions skip the parallel step!
- Process:
  - Check cache first
  - If not cached: get Mistral + Gemma outputs in parallel and save to cache
  - Detect topic
  - Synthesize with topic-aware weighting and confidence notes
- Output: Single, unified response with confidence notes and detected topic
- Use `model: "merge"` in your request

#### 4. Fusion Pipeline (Draft → Refine)
- Two-step process (Mistral draft → Gemma refine)
- Gets the best of both worlds: Fast reasoning + educational quality
- Use `model: "fusion"` or `model: "pipeline"` in your request
- **Mental model**: A writer handing their draft to an editor

#### Which Mode Should You Choose?

| Mode | How it Works | Speed | Best For |
|------|--------------|-------|----------|
| `fusion` or `pipeline` | Sequential (Mistral drafts, Gemma polishes) | Slower | Complex reasoning, math, code review, detailed explanations — when accuracy/quality matter most |
| `merge` | Parallel (both models think independently, then blended) | Faster | Brainstorming, summarization, general Q&A — when speed and diverse perspectives matter more |

**Quick Rule of Thumb**:
- Use `fusion/pipeline` for "deep" tasks (safer default for quality)
- Use `merge` for "fast" tasks or when you want both perspectives

**Best of both worlds**: Combine them! Use `merge` for fast, exploratory answers and `fusion` when the user needs a deep, refined response.

#### 5. Memory Layer
- Responsibilities: Conversation history, User preferences, Language preferences, Session context
- Memory Types:
  - Short-term memory (current conversation)
  - Long-term memory (persistent preferences)
  - Profile memory (user settings)
- Endpoints:
  - `GET /api/voice/memory/{userId}`: Get user memory context
  - `DELETE /api/voice/memory/{userId}`: Clear user conversation memory
- Just include a `userId` in your generate requests to enable memory!

#### 6. TTS Manager
- Responsibilities: Convert final response to speech
- Primary: Kokoro TTS
  - Fast speech generation
  - Offline speech generation
  - Multilingual voices
  - No API costs
- Fallback: ElevenLabs
  - Use `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in .env
- Logic:
  - If Kokoro succeeds → play audio
  - Else → use ElevenLabs
- Response includes `X-TTS-Engine` header showing which engine was used

#### 7. Text-to-Speech (TTS)
- Endpoint: `POST /api/voice/tts`
- Optional `useFallback: true` parameter to skip Kokoro and use ElevenLabs directly

---

## 🎙️ Voice-to-Voice System (Plain English Guide)

> **Who is this for?** Whether you're new to programming (1 year) or experienced (10 years), this section explains exactly how the voice system works — no jargon, no confusion.

---

### 🧠 The Big Idea — What Does "Voice-to-Voice" Mean?

Imagine you're talking to a very smart friend on the phone:

1. **You speak** — your friend hears your voice
2. **They understand** what you said
3. **They think** about the best answer
4. **They speak back** — you hear their voice reply

That's exactly what Probix does — just with software instead of a person:

```
You speak 🗣️
    ↓
Computer hears you (STT — Speech to Text)
    ↓
Computer reads the words and thinks (AI)
    ↓
Computer speaks the answer back (TTS — Text to Speech)
    ↓
You hear the reply 👂
```

**STT** = Speech-To-Text (turning your voice into words)
**TTS** = Text-To-Speech (turning words back into voice)

---

### 🏗️ The Full System — Step by Step

There are **two ways** to use the voice system:

#### Way 1 — REST API (Upload a file, get an answer)
Best for: Apps that record audio and send it to the server.

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: You upload a WAV audio file                                │
│  POST /api/stt/speak   +  your audio file                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: STT ENGINE listens to your audio                           │
│                                                                     │
│  Two "ears" listen at the SAME TIME:                                │
│                                                                     │
│   🟢 VOSK (Ear #1)         🔵 WHISPER (Ear #2)                    │
│   ─────────────            ───────────────────                      │
│   • Super fast (~120ms)    • Slower but smarter (~340ms)           │
│   • Works offline          • Works offline                          │
│   • Good accuracy          • Better accuracy                        │
│   • Streams in real-time   • Processes full audio at once          │
│                                                                     │
│  ⚖️  A "judge" compares both results and picks the BEST one        │
│      (the one with more words, better length, more confidence)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: The AI BRAIN reads your words and thinks                   │
│                                                                     │
│  Two AI models think about your question AT THE SAME TIME:          │
│                                                                     │
│   🧠 MISTRAL                  📚 GEMMA                             │
│   ─────────────               ─────────────                         │
│   Good at: coding,            Good at: explaining things,           │
│   math, reasoning,            simplifying hard topics,              │
│   fast answers                educational formatting                 │
│                                                                     │
│  Then a third step COMBINES both answers into one great reply:      │
│   • For coding questions  → Mistral's answer leads                  │
│   • For explanations      → Gemma's answer leads                    │
│   • For general questions → Both answers balanced equally           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: TTS converts the AI's text reply into VOICE audio          │
│                                                                     │
│   🔊 KOKORO (Primary)          🌐 ELEVENLABS (Backup)              │
│   ────────────────             ──────────────────────               │
│   • Runs on your computer      • Runs in the cloud                  │
│   • Free, no API needed        • Needs an API key                   │
│   • Fast, offline              • Very high quality                  │
│   • If Kokoro fails → ElevenLabs automatically takes over           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: You receive                                                │
│   • The AI's text reply                                             │
│   • A WAV audio file of the AI speaking the reply                  │
│   • Extra info: which STT engine won, confidence score, timing      │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### Way 2 — WebSocket / STT Pro (Live microphone streaming)
Best for: Apps where the user speaks in real time (like a live voice assistant).

```
┌─────────────────────────────────────────────────────────────────────┐
│  Your microphone sends tiny audio chunks LIVE to:                   │
│  WebSocket: ws://localhost:3000/ws/stt-pro                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  WHILE you're speaking — VAD (Voice Activity Detection)             │
│                                                                     │
│  Think of VAD like a dog that notices when you start talking:       │
│   • Measures the LOUDNESS of each audio chunk (called RMS)          │
│   • Quiet chunk  → "silence" — just waits                          │
│   • Loud chunk   → "speech!" — Vosk starts transcribing LIVE       │
│   • 1.5 seconds of silence → "they stopped talking"                │
│                                                                     │
│  While you speak, partial text appears in real-time:               │
│   Server sends: { type: "partial", text: "hello how are..." }      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  You send: { type: "end_stream" }
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AUDIO CLEANING (FFmpeg processes your audio like a studio mixer)   │
│                                                                     │
│   🎚️  Remove low rumble (fans, AC) — highpass filter               │
│   🎚️  Remove high hiss (mic noise) — lowpass filter                │
│   🎚️  AI noise reduction — afftdn                                  │
│   🎚️  Volume normalization — dynaudnorm                            │
│   🎚️  Strip silence gaps — silenceremove                           │
│   🎚️  Broadcast loudness standard — loudnorm                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VOSK + WHISPER both transcribe the cleaned audio (same as Way 1)  │
│  Best transcript is chosen                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MISTRAL fixes grammar & punctuation on the raw transcript          │
│   "hello how are u doing today"                                     │
│   → "Hello, how are you doing today?"                               │
│  (If Mistral is busy → basic cleanup is used in under 2 seconds)   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Server sends final result:                                         │
│  {                                                                  │
│    type: "final",                                                   │
│    text: "Hello, how are you doing today?",                        │
│    sttMeta: {                                                       │
│      engine: "whisper",     ← which engine won                     │
│      confidence: 0.87,      ← how sure we are (0 to 1)            │
│      latency: {                                                     │
│        vosk: 118,           ← vosk took 118ms                      │
│        whisper: 342,        ← whisper took 342ms                   │
│        total: 345           ← total time                           │
│      }                                                              │
│    }                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 🧩 The Two "Ears" — Vosk vs Whisper Explained Simply

| | 🟢 Vosk | 🔵 Whisper |
|---|---|---|
| **What is it?** | A Russian-made speech recogniser | OpenAI's speech AI (same tech as ChatGPT voice) |
| **How fast?** | Very fast (~120ms) | Slower (~340ms) |
| **Internet needed?** | ❌ No — fully offline | ❌ No — fully offline |
| **File size?** | ~60 MB model | ~74 MB model |
| **Can stream live?** | ✅ Yes — word by word | ❌ No — needs the full audio first |
| **Best at?** | Fast, short phrases | Longer sentences, better accuracy |
| **Folder** | `vosk-whisper/vosk/` | `vosk-whisper/whisper/` |

**Why use both?** Because no single engine is perfect for every voice, accent, or phrase. Running both and picking the better result gives you the best of both worlds.

---

### ⚖️ How the "Judge" Picks the Winner

The confidence scorer looks at both transcripts and scores them like this:

```
Score = (number of words ÷ 10) × 50%
      + (number of characters ÷ 60) × 50%
      - 0.3 penalty if it's just one tiny word (probably noise)
```

**Example:**
- Vosk says: `"hi"` → score: 0.08 (very short, likely noise)
- Whisper says: `"hi how are you doing today"` → score: 0.72 ✅ Winner!

---

### 🧠 Three STT Strategies — Choose Your Mode

You can tell the system HOW to use the two engines:

| Strategy | What it does | Best for |
|---|---|---|
| `parallel` ⭐ Default | Both run at the same time. Best result wins. Whisper has a 2.5s timeout — if it's too slow, Vosk's result is used. | Best accuracy, balanced speed |
| `whisper-first` | Whisper tries first. If it gets nothing, Vosk steps in. | Highest accuracy when Whisper is available |
| `vosk-first` | Vosk tries first (fastest). If it gets nothing, Whisper steps in. | Fastest response time |

**How to use in your request:**
```json
{
  "strategy": "parallel"
}
```

Or set a server-wide default in `.env`:
```env
STT_STRATEGY=parallel
WHISPER_TIMEOUT_MS=2500
```

---

### 🔊 TTS — How the AI Speaks Back

After the AI generates a text response, TTS (Text-to-Speech) converts it to audio:

```
AI Text Response
      │
      ▼
tts_manager.js
      │
      ├── Try Kokoro (runs on YOUR computer, free, fast)
      │       ✅ Success → Send WAV audio file
      │       ❌ Fail   →
      │
      └── Try ElevenLabs (cloud, needs API key, very high quality)
              ✅ Success → Send WAV audio file
              ❌ Fail   → Error (configure at least one engine!)
```

Response headers tell you which engine was used:
```
Content-Type: audio/wav
X-TTS-Engine: kokoro   ← or "elevenlabs"
```

**TTS API:**
```
POST /api/voice/tts
{
  "text": "Hello! I'm Probix AI.",
  "voice": "af_bella",
  "language": "a",
  "speed": 1.0,
  "useFallback": false   ← set true to skip Kokoro and go straight to ElevenLabs
}
```

---

### 💾 Memory — The AI Remembers You

When you include a `userId` in your requests, the AI remembers your conversation:

```
First message:
  You: "What is Python?"
  AI: "Python is a programming language..."

Second message (same userId):
  You: "Can you give me an example?"
  AI: "Sure! Based on what we discussed about Python..."
       ↑ It remembers the context from before!
```

Memory has three layers:

| Layer | What it stores | How long |
|---|---|---|
| **Short-term** | Last 20 messages of your conversation | Until server restarts |
| **Profile** | Your language preference, settings | Until server restarts |
| **Long-term** | Key facts you've told the AI | Until server restarts |

> 💡 In a future version, memory will be saved to MongoDB so it persists across restarts.

**Memory API:**
```
GET    /api/voice/memory/:userId   → see what the AI remembers about you
DELETE /api/voice/memory/:userId   → wipe the AI's memory of you
```

---

### 📡 All Voice Endpoints at a Glance

| Endpoint | Type | What it does |
|---|---|---|
| `POST /api/stt/speak` | REST | Upload WAV → Get transcript + AI reply |
| `GET /api/stt/status` | REST | Check if Vosk & Whisper models are loaded |
| `POST /api/voice/generate` | REST | Send text → Get AI reply (no audio needed) |
| `POST /api/voice/tts` | REST | Send text → Get WAV audio file |
| `GET /api/voice/memory/:userId` | REST | See AI's memory for a user |
| `DELETE /api/voice/memory/:userId` | REST | Clear AI's memory for a user |
| `ws://.../ws/stt-pro` | WebSocket | Live microphone → real-time transcript |

---

### 🚀 Quick Start — Send Your First Voice Request

**1. Upload a WAV file (requires login token):**
```bash
curl -X POST http://localhost:3000/api/stt/speak \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@your_recording.wav" \
  -F "strategy=parallel"
```

**Response:**
```json
{
  "success": true,
  "userText": "what is the speed of light",
  "response": "The speed of light is approximately 299,792 km/s...",
  "sttMeta": {
    "engine": "whisper",
    "strategy": "parallel",
    "confidence": 0.83,
    "latency": { "vosk": 115, "whisper": 338, "total": 341 }
  }
}
```

**2. Check model status (no login needed):**
```bash
curl http://localhost:3000/api/stt/status
```

**Response:**
```json
{
  "success": true,
  "sttEngine": {
    "vosk":    { "loaded": true,      "modelPath": "...vosk-whisper/vosk/..." },
    "whisper": { "available": true,   "modelDir":  "...vosk-whisper/whisper/..." },
    "defaultStrategy": "parallel",
    "whisperTimeoutMs": 2500
  }
}
```

---

### 📂 Where the Models Live

Both STT models are stored together in one unified folder:

```
vosk-whisper/
├── vosk/
│   └── vosk-model-small-en-us-0.15/   ← Vosk model (~60 MB)
└── whisper/
    └── tiny.en/
        └── ggml-tiny.en.bin            ← Whisper model (74 MB)
```

> Both models work **100% offline** — no internet required for transcription!

---

### 🎓 For Beginners (1–3 years experience)

Think of the whole voice-to-voice system like a telephone interpreter service:

1. 🗣️ **You speak** into the phone
2. 📝 **Two interpreters** (Vosk and Whisper) both write down what they heard
3. 🏆 **The manager** picks the better written version
4. 🤔 **Two expert consultants** (Mistral and Gemma) read it and write their best answers
5. ✍️ **An editor** combines both answers into one perfect reply
6. 🔊 **A voice actor** (Kokoro) reads the final answer back to you

### 🎓 For Intermediate Developers (3–7 years experience)

The architecture is a clean pipeline:
- **Transport layer**: Multer (REST) or WebSocket binary frames (streaming)
- **STT layer**: `sttEngine.js` — parallel `Promise.all()` with timeout race, confidence scoring
- **AI layer**: `responseFusion.js` — parallel model inference + topic-aware synthesis prompt
- **TTS layer**: `tts_manager.js` — primary/fallback pattern with `axios` binary response
- **Strategy**: configurable per-request via `strategy` field, global default via `STT_STRATEGY` env var

### 🎓 For Advanced Developers (7–10 years experience)

Key design decisions:
- Models loaded as **singletons at require-time** — zero cold-start on requests
- Vosk uses **chunk-based waveform feeding** (4000-byte chunks) to avoid memory spikes
- Whisper uses **temp-file approach** (WAV → tmpdir → whisper binary → cleanup) via `nodejs-whisper`
- **Confidence scoring** is heuristic (word count + char count) — suitable for small/medium models; can be replaced with a proper language model perplexity score
- VAD uses **RMS energy** per chunk — lightweight, no ML model needed for silence detection
- `fusionOnFinal: true` on the stream path means collected chunks are re-processed through full Vosk+Whisper fusion at stream end (higher accuracy than streaming-only)
- FFmpeg filter chain runs via `ffmpeg-static` (bundled binary) — no system FFmpeg dependency

### Gamification System
**Files**: `controllers/gamificationController.js`, `routes/gamificationRoutes.js`, `models/UserStats.js`, `nlp-predictor-pro/`

**Features**:
- XP (Experience Points) and streak tracking
- Level progression (100 XP per level)
- Leaderboard ranking by streak and XP
- Dictionary learning from correct translations
- AI-powered success prediction using local ML model
- Success rate and total activity tracking

### Admin Dashboard
**Files**: `controllers/adminDashboardController.js`, `routes/adminRoutes.js`

**Features**:
- PIN-based admin access
- Dashboard statistics (total users, requests today, requests ever)
- Top active users per day
- Request logs (paginated)
- User management (list, view, delete)
- Waitlist management
- Custom email sending to users

### Waitlist System
**Files**: `controllers/waitlistController.js`, `routes/waitlistRoutes.js`, `models/Waitlist.js`

**Features**:
- User waitlist registration
- Status tracking (pending, approved, rejected)
- Waitlist count and individual status endpoints
- Admin approval/rejection capabilities

## Local Model Servers

The project supports running local models for enhanced privacy and offline usage:

### Supported Models
- **Mistral**: Text generation (OpenAI-like API)
- **Gemma**: Text generation (Google's open model)
- **Kokoro**: Text-to-Speech (high-quality, lightweight)

### Setup

1. **Clone Model Repositories** (if not already present):
```bash
mkdir -p models
cd models
git clone https://github.com/mistralai/mistral-inference.git
git clone https://github.com/google-deepmind/gemma.git
git clone https://github.com/hexgrad/kokoro.git
```

2. **Organize Models into `ai_models/`** (Windows PowerShell):
```powershell
.\scripts\reorg-models.ps1
```

3. **Start Servers** (Windows PowerShell):
```powershell
.\start-all.ps1
```
This will start the local Mistral, Gemma, and Math services plus the Probix backend.

> Note: Local Mistral and Gemma model servers are optional and must be started separately if you want to use `MISTRAL_URL` and `GEMMA_URL` directly.

---

## 📝 AI Models Folder Guide: What to Keep

This section explains what files to keep in the `ai_models/` directory!

### What to *KEEP* (You Might Need These Later!)
Think of these like "extra tools in your toolbox"—you might not use them today, but they're really helpful if you ever need to fix something or learn more:

1. **`examples/`**  
   📚 Like a recipe book for the models! Shows exactly how other people use them.

2. **`tests/`**  
   ✅ Like a "health check" for the models! Makes sure everything is working properly on your computer.

3. **`docs/` & `colabs/`**  
   🎓 Tutorials and step-by-step guides! Great if you ever get stuck or want to learn cool tricks.

4. **`pyproject.toml` / `poetry.lock` / `uv.lock`**  
   🧰 Think of these as a **detailed shopping list** for each model!
   - **`pyproject.toml`**: The *main shopping list* that says, "I need bread, eggs, and milk" (or in tech terms, "I need these specific Python tools to run this model").
   - **`poetry.lock` or `uv.lock`**: The *exact receipt* that says, "I bought Brand X bread, Grade A eggs, and 2% milk from Store Y" (so anyone else can get *exactly* the same stuff, so everything works the same way).  
   These files make setting up the models way easier—you don't have to guess what tools you need!

5. **`CHANGELOG.md`**  
   📰 A "news update" for the models! Tells you what new features or fixes were added.

6. **`.pylintrc`**  
   🤷‍♂️ A tiny settings file that doesn't hurt anything—just leave it there!

### 🚨 *NEVER* DELETE THESE!
You *must* keep these to stay legal and out of trouble:
- `LICENSE` files (rules for using the models)
- `README.md` files (basic info about the models)
- `.gitignore` files (keeps your Git clean)

---

## Deployment

### Docker

The project includes Docker support for easy deployment:

1. **Build and Start with Docker Compose**:
```bash
docker-compose up -d --build
```

2. **Services Started**:
- `probix-backend`: Node.js API on port 3000
- `math-service`: Python math verification microservice on port 8001

### PM2

For production deployment using PM2:

1. **Install PM2**:
```bash
npm install -g pm2
```

2. **Start Application**:
```bash
pm2 start ecosystem.config.js
```

3. **Useful PM2 Commands**:
```bash
pm2 status                  # Check status
pm2 logs probix             # View logs
pm2 restart probix          # Restart app
pm2 stop probix             # Stop app
pm2 delete probix           # Remove app
pm2 startup                 # Auto-start on system boot
```

## Security

- **Keep Secrets Safe**: Never commit `.env` file or secrets to version control
- **JWT Security**: Use strong `JWT_SECRET` and appropriate expiration times
- **CORS Configuration**: Restrict `ALLOWED_ORIGINS` to your domains in production
- **Rate Limiting**: Global and per-user rate limits to prevent abuse
- **Cloudflare Support**: Use Cloudflare headers for better security and IP resolution
- **Input Validation**: All API inputs are validated using express-validator
- **Helmet**: Security headers enabled via Helmet middleware
- **Password Hashing**: User passwords are hashed with bcryptjs

## Notes for Developers

### Project Structure Overview
- The main Express app is in `index.js`
- Routes are registered in `index.js` and defined in the `routes/` directory
- Business logic lives in `controllers/`
- Data models are defined using Mongoose in `models/`
- Middleware is stored in `middleware/`
- Utility functions are in `utils/`

### Development Best Practices
1. Run `npm run dev` during development for auto-reload
2. Always test endpoints using the Swagger UI
3. Keep `.env` file updated with your local configuration
4. Write validation schemas for all new API endpoints
5. Use appropriate HTTP status codes and error messages

### Making Changes
1. Create a new branch for your feature/bug fix
2. Make your changes and test thoroughly
3. Ensure all existing endpoints still work
4. Update this README if you add new features
5. Submit a pull request for review

---

## Troubleshooting

### MongoDB Connection Issues
- Check `MONGO_DB_CONNECTION_STRING` in `.env`
- Ensure your IP is whitelisted if using MongoDB Atlas
- Verify MongoDB service is running if using local instance

### Port Conflicts
- If port 3000 is already in use, change `PORT` in `.env`
- For model servers, update ports in `.env` and `start-all.ps1`

### Local Model Issues
- Make sure Python 3.9+ is installed
- Create virtual environments for each model repo
- Download model weights according to official documentation

---

## 🔬 Full File Reference — Voice Engine Deep Dive

> This section explains **every single file** inside the three voice-related areas of the project.
> Read it top to bottom and you will understand **exactly** what each file does, why it exists, and how it connects to everything else.

---

## 📁 `vosk-whisper/` — The Model Vault

This is the **single unified folder** that holds both offline speech recognition models.
No internet is needed. Both models live here permanently.

```
vosk-whisper/
├── vosk/
│   └── vosk-model-small-en-us-0.15/        ← Kaldi acoustic model (~60 MB total)
│       ├── am/
│       │   └── final.mdl                    ← The actual neural network weights (15 MB)
│       ├── conf/
│       │   ├── mfcc.conf                    ← Audio feature config (how audio is converted to numbers)
│       │   ├── model.conf                   ← Model configuration switches
│       │   └── online_cmvn.conf             ← Online speaker normalization settings
│       ├── graph/
│       │   ├── Gr.fst                       ← Language model graph (23 MB) — what words are likely
│       │   └── HCLr.fst                     ← Full acoustic + language decoder graph (21 MB)
│       ├── ivector/
│       │   ├── final.dubm                   ← Speaker model (0.2 MB)
│       │   ├── final.ie                     ← i-vector extractor (8 MB) — adapts to YOUR voice
│       │   ├── final.mat                    ← Linear transform matrix
│       │   ├── global_cmvn.stats            ← Global audio normalisation statistics
│       │   └── splice.conf                  ← Frame splicing config
│       └── README                           ← Vosk model credits and info
└── whisper/
    └── tiny.en/
        └── ggml-tiny.en.bin                 ← Full Whisper tiny.en model (74 MB)
```

### `vosk-whisper/vosk/vosk-model-small-en-us-0.15/`

This is the **Kaldi-based Vosk acoustic model** for English. Here is what every sub-folder actually does:

| Folder / File | Plain English Explanation |
|---|---|
| `am/final.mdl` | The brain of Vosk. A Deep Neural Network (TDNN) trained on thousands of hours of English speech. When you speak, this file converts your audio waveform into probabilities of which sounds (phonemes) you said. |
| `conf/mfcc.conf` | Tells Vosk how to convert raw audio into numbers. It uses MFCC (Mel-Frequency Cepstral Coefficients) — the same technique used in music shazam apps. |
| `conf/model.conf` | Switches that control how the model runs (e.g. whether to use online/offline mode). |
| `conf/online_cmvn.conf` | CMVN = Cepstral Mean and Variance Normalisation. Makes the model work better across different microphones and recording environments. |
| `graph/Gr.fst` | The Language Model. An FST (Finite State Transducer) that encodes which words and word sequences are probable in English. If the acoustic model hears "I eight" vs "I ate", this graph helps pick the right one. |
| `graph/HCLr.fst` | The full combined decoder graph. H=HMM topology, C=context, L=lexicon, r=right-context. This is what makes decoding fast — everything is pre-compiled into one searchable graph. |
| `ivector/final.ie` | i-Vector extractor. Adapts the model to the current speaker's voice characteristics in real time. Makes recognition better when someone has an accent or unusual speaking style. |
| `ivector/final.dubm` | A Diagonal UBM (Universal Background Model). Used by the i-vector extractor as a reference of what "average speech" sounds like. |

### `vosk-whisper/whisper/tiny.en/ggml-tiny.en.bin`

This is the **OpenAI Whisper Tiny (English-only) model** in GGML format.

| Property | Value |
|---|---|
| Architecture | Transformer encoder-decoder |
| Parameters | ~39 million |
| File size | 74 MB |
| Format | GGML (efficient binary format for CPU inference) |
| Language | English only (faster and more accurate than multilingual for English) |
| Processing | Batch-only — needs the full audio clip before it can transcribe |

How it works:
1. Your audio is written to a temp `.wav` file
2. The `nodejs-whisper` package calls the Whisper binary with this file
3. Whisper's encoder converts audio into a vector embedding
4. The decoder auto-regressively generates text tokens one by one
5. The text segments are joined and returned

---

## 📁 `utils/voice/` — The AI Voice Brain

This folder handles **everything related to AI text generation, voice pipeline, memory, and TTS**.
It is used by the REST API endpoints (`/api/voice/` and `/api/stt/`).

```
utils/voice/
├── sttEngine.js        ← ⭐ Unified Vosk + Whisper STT engine (the core)
├── sttService.js       ← Backward-compatible wrapper around sttEngine
├── voicePipeline.js    ← Connects STT → AI response (the glue)
├── responseFusion.js   ← Runs Mistral + Gemma AI in parallel, merges them
├── fusion.js           ← Legacy Draft→Refine pipeline (Mistral then Gemma)
├── modelSelector.js    ← Picks which AI mode to use based on request
├── memoryManager.js    ← Stores conversation history per user
├── tts_manager.js      ← Converts text to speech (Kokoro → ElevenLabs)
├── mistral_core.js     ← HTTP client for the Mistral model server
└── gemma_core.js       ← HTTP client for the Gemma model server
```

---

### 📄 `sttEngine.js` — ⭐ The Unified STT Brain

**What it is:** The single, central speech-to-text engine that controls both Vosk and Whisper.
Every part of the system that needs to transcribe audio goes through this file.

**What it does in detail:**

1. **At startup** — Loads both models into memory once:
   - Vosk: `new vosk.Model(VOSK_MODEL_PATH)` — kept as a singleton (`_voskModel`)
   - Whisper: checks that the model folder exists, sets `_whisperAvailable = true`

2. **`transcribe(audioBuffer, options)`** — Main public method:
   - Reads the `strategy` option (`parallel`, `whisper-first`, or `vosk-first`)
   - Runs the chosen strategy (see below)
   - Runs `scoreTranscript()` on the result
   - Returns: `{ text, engine, strategy, confidence, latency }`

3. **`_runVosk(audioBuffer)`** — Private Vosk runner:
   - Creates a new `vosk.Recognizer` (one per request — freed after use)
   - Feeds audio in 4000-byte chunks via `recognizer.acceptWaveform(chunk)`
   - Collects partial results as chunks are accepted
   - Calls `recognizer.finalResult()` at the end
   - Frees the recognizer (prevents memory leaks)
   - Returns: `{ text, latency, available }`

4. **`_runWhisper(audioBuffer)`** — Private Whisper runner:
   - Writes the buffer to a temp `.wav` file in `os.tmpdir()`
   - Calls `nodejs-whisper` with `tiny.en` model settings:
     - `threads`: half the CPU cores (leaves headroom for other work)
     - `quantize: true` — uses 4-bit weights for faster CPU inference
     - `beamSize: 1, bestOf: 1` — greedy decoding (fastest mode)
     - `temperature: 0` — deterministic output (no randomness)
   - Parses the returned segments, joins to a string
   - Deletes the temp file (always, even on error)
   - Returns: `{ text, latency, available }`

5. **`_runWhisperWithTimeout(audioBuffer, timeoutMs)`** — Whisper with hard limit:
   - Uses `Promise.race()` between `_runWhisper()` and a `setTimeout`
   - If Whisper takes longer than `WHISPER_TIMEOUT_MS` (default 2500ms), the race resolves with an empty result
   - Prevents Whisper from holding up the whole pipeline

6. **The three strategies:**

   | Strategy | Code Path |
   |---|---|
   | `parallel` | `Promise.all([_runWhisperWithTimeout(), _runVosk()])` — both run simultaneously. `scoreTranscript()` picks winner. |
   | `whisper-first` | `await _runWhisperWithTimeout()` → if empty, `await _runVosk()` |
   | `vosk-first` | `await _runVosk()` → if empty, `await _runWhisperWithTimeout()` |

7. **`scoreTranscript(text)`** — Confidence scorer:
   ```
   score = (wordCount ÷ 10 × 0.5) + (charCount ÷ 60 × 0.5)
           − 0.3 penalty if single word shorter than 4 characters
   ```
   Range: `0.0` (empty/noise) to `1.0` (full, confident transcript)

8. **`transcribeStream(audioStream, callbacks, options)`** — Streaming mode:
   - Uses Vosk for live partial results as audio data events arrive
   - Collects all chunks into a buffer
   - At stream `end`: re-runs the full `transcribe()` fusion on the collected buffer for best final accuracy
   - Fires `onPartial(text)` in real-time, `onFinal(result)` when done

9. **`getStatus()`** — Health endpoint data:
   - Returns Vosk loaded state, model path, Whisper availability, model dir, strategy, timeout

**Exports:** `transcribe`, `transcribeStream`, `getStatus`, `scoreTranscript`

---

### 📄 `sttService.js` — Backward-Compatible Wrapper

**What it is:** A thin compatibility layer so that any old code importing `sttService` still works without changes.

**What it does:**
- `transcribeAudio(buffer, options)` — calls `sttEngine.transcribe()` and returns just the `text` string
- `transcribeStream(stream, onPartial, onFinalText)` — wraps `sttEngine.transcribeStream()` so the `onFinal` callback receives a plain string instead of the full result object

**Why it exists:** Before the unified engine was built, Vosk-only code imported `sttService`. Rather than breaking all those imports, this wrapper keeps the old interface alive while delegating to the new engine underneath.

**Exports:** `transcribeAudio`, `transcribeStream`

---

### 📄 `voicePipeline.js` — STT → AI Glue

**What it is:** The bridge that connects the STT layer to the AI layer for the REST endpoint `/api/stt/speak`.

**What it does step by step:**
1. Receives `audioBuffer`, `history`, and `options` (including `strategy`)
2. Calls `sttEngine.transcribe(audioBuffer, options)` → gets `sttResult`
3. Checks if `sttResult.text` is empty → throws a user-friendly error if so
4. Calls `responseFusion.generate({ prompt: userText, history })` → gets `aiResponse`
5. Returns the combined result:
   ```json
   {
     "success": true,
     "userText": "what the user said",
     "response": "AI reply text",
     "model": "merge",
     "topic": "general",
     "fromCache": false,
     "sttMeta": {
       "engine": "whisper",
       "strategy": "parallel",
       "confidence": 0.87,
       "latency": { "vosk": 118, "whisper": 342, "total": 345 }
     }
   }
   ```

**Who calls it:** `routes/stt.js` → `handleVoiceRequest(req.file.buffer, history, options)`

**Exports:** `handleVoiceRequest`

---

### 📄 `responseFusion.js` — The AI Intelligence Layer

**What it is:** The engine that runs two AI models (Mistral + Gemma) in parallel and synthesises their outputs into one superior answer.

**What it does step by step:**

1. **`generate({ prompt, history, max_tokens, temperature })`** — Entry point:
   - Calls `getBothResponses()` then `mergeResponses()`

2. **`checkCache(prompt)`** — Cache lookup:
   - Uses a `Map` keyed by the lowercase trimmed prompt
   - If found and less than 1 hour old → returns cached Mistral+Gemma outputs (skips inference!)

3. **`getBothResponses()`** — Parallel AI inference:
   - `Promise.all([mistral.generate(), gemma.generate()])` — both models run simultaneously
   - Saves result to cache

4. **`detectTopic(prompt)`** — Topic classifier:
   - Scans for coding keywords (`code`, `function`, `python`, `bug`, `api`…) → `'coding'`
   - Scans for explanation keywords (`explain`, `how`, `what`, `why`, `teach`…) → `'explanation'`
   - Otherwise → `'general'`

5. **`synthesizeResponses({ mistralOutput, gemmaOutput, originalPrompt })`** — The synthesis:
   - Builds a prompt like: _"You have two expert answers. Synthesize them into ONE cohesive response. [topic instruction]. ANSWER A: [mistral]. ANSWER B: [gemma]. FINAL ANSWER:"_
   - Sends this to **Mistral** (which acts as the editor/synthesiser)
   - Topic weighting:
     - Coding → prioritise Mistral's technical details
     - Explanation → prioritise Gemma's educational clarity
     - General → balance both equally
   - Asks Mistral to add a "CONFIDENCE NOTES" section for uncertain parts

6. **`mergeResponses()`** — Packages the result:
   ```json
   {
     "mistral": "Mistral's raw answer",
     "gemma":   "Gemma's raw answer",
     "merged":  "The synthesised final answer",
     "final":   "Same as merged",
     "topic":   "coding | explanation | general"
   }
   ```

**Exports:** `ResponseFusion` class (static methods)

---

### 📄 `fusion.js` — Legacy Two-Step Pipeline

**What it is:** The original Draft→Refine pipeline. Still available when `model: "fusion"` or `model: "pipeline"` is requested.

**What it does:**

1. **Step 1 — Draft (Mistral):**
   - Mistral is given the system prompt: _"You are the PRIMARY INTELLIGENCE ENGINE. Generate a draft answer."_
   - Produces a technically strong but possibly dense draft

2. **Step 2 — Refine (Gemma):**
   - Gemma receives the draft with the system prompt: _"You are the QUALITY & EDUCATION ENGINE. Take this draft and refine it for clarity, education, and quality."_
   - Returns a cleaner, more readable version

**Result:** `{ draft: "Mistral's draft", refined: "Gemma's polished version" }`

**Mental model:** Like a writer handing their first draft to an editor.

**Difference from `responseFusion.js`:** Fusion runs sequentially (draft first, then refine). ResponseFusion runs in parallel then synthesises. Fusion is more predictable; ResponseFusion is faster and often more creative.

**Exports:** `generateRefinedAnswer`

---

### 📄 `modelSelector.js` — AI Mode Router

**What it is:** A tiny function that maps the `model` field in a request to an internal engine name.

**The mapping:**
```
"mistral" or nothing  →  'mistral'   (Mistral only)
"gemma"               →  'gemma'     (Gemma only)
"merge"               →  'merge'     (ResponseFusion parallel synthesis)
"fusion" / "pipeline"
  / "both"            →  'fusion'    (legacy Draft→Refine pipeline)
```

**Who uses it:** `controllers/voiceController.js` — reads `model` from the request body, calls `pickModel()`, then routes to the correct AI pipeline.

**Exports:** `pickModel`

---

### 📄 `memoryManager.js` — Conversation Memory

**What it is:** A three-tier in-memory store that gives the AI a sense of "remembering" users across messages within a server session.

**The three memory tiers:**

| Tier | Storage Key | What is stored | Max size |
|---|---|---|---|
| **Short-term** | `conversations` Map | Array of `{ role, content, timestamp }` messages | Last 20 messages (older ones are dropped) |
| **Profile** | `profiles` Map | `{ userId, language, preferences, createdAt }` | Unlimited |
| **Long-term** | `longTerm` Map | Key-value pairs of facts about the user | Unlimited |

**Methods:**
- `getConversation(userId)` — returns the user's message array (creates empty one if new)
- `addToConversation(userId, role, content)` — appends a message; drops oldest if > 20 messages
- `getProfile(userId)` — returns or creates a user profile object
- `updateProfile(userId, updates)` — merges updates into the profile
- `saveLongTerm(userId, key, value)` — stores a key-value fact
- `getLongTerm(userId, key)` — retrieves a stored fact
- `getContext(userId)` — returns all three tiers together for prompt injection
- `clearConversation(userId)` — resets the conversation array to empty

**How it's used:** In `voiceController.js`:
- Before generating: `MemoryManager.getContext(userId)` → prepend history to prompt
- After generating: `addToConversation(userId, 'user', prompt)` + `addToConversation(userId, 'assistant', reply)`

⚠️ **Important:** All memory is in-process RAM. It is lost when the server restarts.

**Exports:** `MemoryManager` class (static methods)

---

### 📄 `tts_manager.js` — Text-to-Speech Manager

**What it is:** Converts text into spoken audio (WAV file). Uses two engines with automatic failover.

**Engine 1 — Kokoro (Primary):**
- Runs as a separate local FastAPI server on `localhost:8880` (or `KOKORO_URL` env var)
- Called via `POST ${KOKORO_URL}/tts` with `{ text, language, voice, speed }`
- Returns raw audio bytes (WAV format) in `response.data`
- 30-second timeout
- Completely free, no API key, no internet

**Engine 2 — ElevenLabs (Fallback):**
- Cloud API at `https://api.elevenlabs.io/v1/text-to-speech/:voiceId`
- Requires `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env`
- Uses `eleven_multilingual_v2` model
- Also 30-second timeout
- Costs money per character (pay-as-you-go)

**Failover logic:**
```
if useFallback === false:
    try Kokoro
    if Kokoro fails → try ElevenLabs
if useFallback === true:
    skip Kokoro → go straight to ElevenLabs
if both fail → throw Error("All TTS engines failed")
```

**Returns:** `{ audio: Buffer, engine: 'kokoro'|'elevenlabs', success: true }`

**Exports:** `tts`

---

### 📄 `mistral_core.js` — Mistral HTTP Client

**What it is:** A simple HTTP client that sends prompts to the local Mistral model server and returns the response text.

**How it works:**
- Makes a POST request to `MISTRAL_URL` (default `localhost:8001`)
- Sends `{ prompt, history, max_tokens, temperature }`
- Returns the text response as a string

**Why it's separate:** Isolates the Mistral communication so that `responseFusion.js` and `fusion.js` don't need to know how HTTP calls work.

**Exports:** `generate`

---

### 📄 `gemma_core.js` — Gemma HTTP Client

**What it is:** Identical in structure to `mistral_core.js` but targets the Gemma model server at `GEMMA_URL` (default `localhost:8002`).

**Exports:** `generate`

---

## 📁 `utils/voice-stt-pro/` — Real-Time WebSocket STT

This folder handles **live microphone streaming over WebSocket**.
It is the engine behind `ws://localhost:3000/ws/stt-pro`.

```
utils/voice-stt-pro/
├── server.js              ← WebSocket server — manages connections, message protocol
├── vadHandler.js          ← Voice Activity Detection — detects speech vs silence live
├── audioPreprocess.js     ← FFmpeg audio cleaner — removes noise, normalises volume
├── sttFusion.js           ← Bridge to the unified sttEngine
└── mistralPostProcess.js  ← Grammar & punctuation fixer for raw transcripts
```

---

### 📄 `server.js` — WebSocket Server

**What it is:** Initialises and manages the WebSocket server for live audio streaming. Called from `index.js` at startup: `initSTTPro(server, app)`.

**What it sets up:**
- Attaches a `ws.Server` to the existing HTTP server on path `/ws/stt-pro`
- Serves the STT Pro frontend (HTML/CSS/JS) at `/stt-pro` via `express.static`

**Per-connection state (one set per browser/client):**
```
sessionId     — unique UUID for this connection
audioChunks[] — array collecting every binary audio frame received
vadSession    — a VadSession instance (handles live partial results)
isProcessing  — boolean flag, prevents double-processing at stream end
```

**WebSocket message protocol — full detail:**

| Direction | Message | Type | What it means |
|---|---|---|---|
| Server → Client | `{ type: "ready", sessionId }` | JSON | Connection established, here's your session ID |
| Client → Server | Binary `Buffer` | Binary | One chunk of raw PCM audio from the microphone |
| Client → Server | `{ type: "end_stream", strategy? }` | JSON | User stopped speaking, process everything now |
| Client → Server | `{ type: "cancel" }` | JSON | Abort — throw everything away |
| Server → Client | `{ type: "partial", text }` | JSON | Live transcript as user speaks (Vosk streaming) |
| Server → Client | `{ type: "processing", stage }` | JSON | Status updates during processing pipeline |
| Server → Client | `{ type: "final", text, raw, sttMeta, elapsed }` | JSON | The finished, corrected transcript + telemetry |
| Server → Client | `{ type: "error", message }` | JSON | Something went wrong |
| Server → Client | `{ type: "cancelled" }` | JSON | Cancel acknowledged |

**The `processFinalTranscription()` pipeline (triggered by `end_stream`):**
```
1. Concat all audioChunks[] into one Buffer
2. audioPreprocess.preprocessAudio(rawBuffer)      → cleaned WAV buffer
3. sttFusion.transcribeFusionFull(cleanBuffer)     → { text, engine, confidence, latency }
4. mistralPostProcess.postProcessWithMistral(text) → corrected text
5. ws.send({ type: "final", text, raw, sttMeta, elapsed })
6. Reset: audioChunks = [], vadSession.reset(), isProcessing = false
```

**On WebSocket `close`:** `vadSession.free()` is called to release the Vosk recognizer from memory.

**Exports:** `initSTTPro`

---

### 📄 `vadHandler.js` — Voice Activity Detection

**What it is:** A per-connection session object that:
1. Detects whether each audio chunk contains speech or silence
2. Feeds speech chunks to Vosk for live partial transcription
3. Detects end-of-speech (1.5 seconds of silence after speech)

**The `VadSession` class:**

**Constructor options:**
- `silenceThreshold` (default: 300) — RMS amplitude below this = silence
- `maxSilenceChunks` (default: 25) — number of silence chunks = ~1.5 seconds of silence

**Internal state:**
- `silenceChunks` — counter of consecutive silent chunks
- `hasSpoken` — whether any speech has been detected yet
- `lastPartial` — last partial text from Vosk (avoids sending duplicate partials)
- `recognizer` — a Vosk `Recognizer` instance for live streaming

**Methods:**

`_computeRMS(buffer)`:
- Interprets buffer as `Int16Array` (16-bit PCM samples)
- Computes Root Mean Square: `sqrt(mean(samples²))`
- RMS is a measure of audio energy/loudness
- High RMS = loud audio = likely speech

`processChunk(buffer)`:
- Computes RMS of the chunk
- If `rms < silenceThreshold` → increment silence counter, return `''`
- If `rms >= silenceThreshold` → mark `hasSpoken = true`, reset silence counter
- Feeds chunk to Vosk recognizer:
  - `recognizer.acceptWaveform()` returns `true` when a phrase is complete → returns final text
  - Returns `false` during speech → returns partial text (if different from last)

`isEndOfSpeech()`:
- Returns `true` when `hasSpoken && silenceChunks >= maxSilenceChunks`
- Used by the server to auto-trigger processing without the client sending `end_stream`

`getFinalResult()`:
- Calls `recognizer.finalResult()` to get any remaining buffered text
- Returns cleaned text string

`reset()`:
- Resets silence counter, spoken flag, last partial
- Frees and recreates the Vosk recognizer (fresh slate for next utterance)

`free()`:
- Releases the Vosk recognizer memory
- Must be called when the WebSocket connection closes

**Why Vosk (not Whisper) for VAD?**
Vosk can process audio chunk-by-chunk in real-time. Whisper needs the full audio clip and cannot stream. So Vosk handles the live word-by-word display, while Whisper joins only at the end for its more accurate final pass.

**Exports:** `VadSession`

---

### 📄 `audioPreprocess.js` — FFmpeg Audio Cleaner

**What it is:** Cleans raw microphone audio using FFmpeg before it is sent to the STT engines.
Without cleaning, background noise, fan hum, mic hiss, and volume variations all hurt accuracy.

**What it does:**

1. Writes the raw buffer to a temp input file (`stt-input-{uuid}.raw`) in `os.tmpdir()`
2. Runs FFmpeg through the `fluent-ffmpeg` Node.js wrapper
3. Uses `ffmpeg-static` (bundled binary — no system FFmpeg install needed)
4. Applies a 6-stage filter chain:

| Filter | What it removes | Technical name |
|---|---|---|
| `highpass=f=80` | Low-frequency rumble (AC units, fans, vibration below 80Hz) | High-pass filter |
| `lowpass=f=8000` | High-frequency hiss above 8kHz (irrelevant for speech) | Low-pass filter |
| `afftdn=nf=-25` | AI-powered noise reduction (removes noise at -25dB threshold) | FFT denoiser |
| `dynaudnorm=p=0.95:m=10` | Smooths volume spikes, normalises dynamics | Dynamic normaliser |
| `silenceremove=1:0:-50dB` | Strips silence at start/end of audio | Silence remover |
| `loudnorm=I=-16:TP=-1.5:LRA=11` | Normalises to broadcast standard (-16 LUFS) | Loudness normaliser |

5. Output format: `WAV, 16kHz, mono, 16-bit PCM` (exactly what Vosk and Whisper need)
6. On FFmpeg error: falls back to the raw buffer (transcription still attempted)
7. Always cleans up temp files (both input and output), even on error

**The `cleanupFiles()` helper:**
- Iterates a list of file paths and deletes them
- Catches errors silently (file may already be gone)

**Exports:** `preprocessAudio`

---

### 📄 `sttFusion.js` — STT Pro Bridge

**What it is:** The connector between the STT Pro WebSocket server and the unified `sttEngine`.

**Why it exists:** Before the unified engine, `sttFusion.js` contained its own copy of Vosk and Whisper logic. Now it simply delegates to `sttEngine`, keeping the `server.js` interface unchanged.

**Two exported functions:**

`transcribeFusion(audioBuffer, options)`:
- Backward-compatible — returns a plain `string` (the transcript text)
- Used when callers just need the text and don't care about telemetry
- Internally calls `sttEngine.transcribe()` with `strategy: 'parallel'`
- Logs: `[STT Fusion] Engine: whisper | Confidence: 0.87 | "hello world"`

`transcribeFusionFull(audioBuffer, options)`:
- New, richer version — returns the full object: `{ text, engine, strategy, confidence, latency }`
- Used by `server.js` so the WebSocket `final` message can include `sttMeta`

**Exports:** `transcribeFusion`, `transcribeFusionFull`

---

### 📄 `mistralPostProcess.js` — Transcript Grammar Fixer

**What it is:** A post-processing step that sends the raw STT transcript to Mistral for light grammar and punctuation correction.

**What it does:**

1. If the text is 2 words or fewer → skip Mistral, just run `basicCleanup()` directly
2. Otherwise, sends this prompt to Mistral (via `axios.post` to `MISTRAL_URL`):
   > _"You are a speech-to-text correction assistant. Fix only: capitalization, punctuation, homophones (to/too/two, there/their, buy/by), word boundaries. Do NOT change meaning. Do NOT add words. Return ONLY corrected text. Raw text: [transcript]"_
3. Uses a **2-second hard timeout** (`AbortController`):
   - If Mistral responds in time → return corrected text
   - If Mistral is slow or offline → fall back to `basicCleanup()` immediately
4. Uses Mistral settings: `temperature: 0.1` (near-deterministic), `num_predict: 200`

**`basicCleanup(text)` — The lightweight fallback:**
- `.trim()` — remove leading/trailing spaces
- `.replace(/\s+/g, ' ')` — collapse multiple spaces to one
- `.replace(/^[a-z]/, match => match.toUpperCase())` — capitalise first letter
- `.replace(/\s*([.,!?])\s*/g, '$1 ')` — fix punctuation spacing

**Example transformations:**
```
Raw:       "hello how r u doing today i was wondering"
Mistral:   "Hello, how are you doing today? I was wondering..."

Raw:       "i eight an apple"
Mistral:   "I ate an apple."
```

**Why 2 seconds?** The STT Pro pipeline already takes 300-400ms. Mistral correction is a bonus — it should not be a bottleneck. If Mistral is running locally and busy, the basic cleanup keeps the user experience fast.

**Exports:** `postProcessWithMistral`

---

## 🔗 How Everything Connects — The Complete Map

```
index.js (startup)
   │
   ├── app.use('/api/stt', sttRoutes)           ← REST: routes/stt.js
   ├── app.use('/api/voice', voiceRoutes)        ← REST: routes/voiceRoutes.js
   └── initSTTPro(server, app)                   ← WebSocket: utils/voice-stt-pro/server.js
   
   
REST Path: POST /api/stt/speak
   routes/stt.js
       → multer.memoryStorage()   (audio buffer in memory)
       → protect middleware        (JWT check)
       → userRateLimiter()        (per-user rate limit)
       → voicePipeline.handleVoiceRequest(buffer, history, { strategy })
              → sttEngine.transcribe(buffer, opts)
                     → _runVosk()        [parallel]
                     → _runWhisperWithTimeout()  [parallel]
                     → scoreTranscript() → pick winner
              → responseFusion.generate({ prompt: userText, history })
                     → getBothResponses() → Promise.all([mistral, gemma])
                     → detectTopic(prompt)
                     → synthesizeResponses() → mistral (as editor)
              → return { userText, response, sttMeta }


REST Path: POST /api/voice/generate
   routes/voiceRoutes.js
       → voiceController.generate()
              → MemoryManager.getContext(userId)   [optional]
              → modelSelector.pickModel(model)
              → ResponseFusion.generate()  OR  oldFusion.generateRefinedAnswer()  OR  singleModel.generate()
              → MemoryManager.addToConversation()  [optional]


REST Path: POST /api/voice/tts
   routes/voiceRoutes.js
       → voiceController.tts()
              → ttsManager.tts({ text, language, voice, speed })
                     → axios.post(KOKORO_URL/tts)   [primary]
                     → axios.post(elevenlabs API)   [fallback]
              → res.send(wavBuffer)


WebSocket: ws://localhost:3000/ws/stt-pro
   voice-stt-pro/server.js
       → new VadSession()
       │
       ├── Binary frame → vadSession.processChunk(chunk)
       │       → _computeRMS(chunk)
       │       → vosk recognizer → ws.send({ type: "partial", text })
       │
       └── end_stream → processFinalTranscription()
               → Buffer.concat(chunks)
               → audioPreprocess.preprocessAudio()   [FFmpeg 6-filter chain]
               → sttFusion.transcribeFusionFull()
                      → sttEngine.transcribe()
                             → _runVosk() + _runWhisperWithTimeout()
                             → scoreTranscript() → pick winner
               → mistralPostProcess.postProcessWithMistral()   [2s timeout]
               → ws.send({ type: "final", text, sttMeta })
```

---

## Support & Contact

For questions or issues, contact the Probix AI team or check the project's issue tracker.
