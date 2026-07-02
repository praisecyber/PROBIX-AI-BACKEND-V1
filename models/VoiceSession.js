const mongoose = require('mongoose');

const VoiceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  model: { type: String, default: 'mistral' },
  prompt: String,
  response: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoiceSession', VoiceSessionSchema);
