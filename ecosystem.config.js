const path = require('path');

module.exports = {
  apps: [
    // Main Probix Backend
    {
      name: 'probix-backend',
      script: './index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },

    // Math Service
    {
      name: 'math-service',
      script: 'main.py',
      cwd: path.join(__dirname, 'nllb-translator', 'math-service'),
      interpreter: path.join(__dirname, '.venv', 'Scripts', 'python.exe'), // Windows path
      // For Linux/Mac: interpreter: path.join(__dirname, '.venv', 'bin', 'python'),
      autorestart: true,
      watch: false,
    },

    // Mistral Server
    {
      name: 'mistral-server',
      script: 'main.py',
      cwd: path.join(__dirname, 'ai_models', 'mistral-server'),
      interpreter: path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
      autorestart: true,
      watch: false,
    },

    // Gemma Server
    {
      name: 'gemma-server',
      script: 'main.py',
      cwd: path.join(__dirname, 'ai_models', 'gemma-server'),
      interpreter: path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
      autorestart: true,
      watch: false,
    },
  ],
};
