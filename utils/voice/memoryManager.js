// Memory Manager for Voice AI
// Manages short-term, long-term, and profile memory
// Uses MongoDB when available, falls back to in-memory storage for demo

const mongoose = require('mongoose');

// Load MongoDB models
let UserMemory, VoiceSession;
try {
  UserMemory = require('../../models/UserMemory');
  VoiceSession = require('../../models/VoiceSession');
} catch (e) {
  console.warn('[MemoryManager] MongoDB models not found, using in-memory only');
}

// In-memory fallback storage (for demo; used when MongoDB isn't available)
const memoryStore = {
  // Short-term: current conversation history
  conversations: new Map(),
  // Long-term: user preferences and past interactions
  longTerm: new Map(),
  // Profile: user settings and preferences
  profiles: new Map()
};

// Check if MongoDB is connected
function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

class MemoryManager {
  /**
   * Get or create a user's conversation history
   */
  static async getConversation(userId) {
    if (isMongoConnected() && UserMemory) {
      try {
        // Get recent voice sessions from MongoDB
        const sessions = await VoiceSession.find({ userId })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
        
        // Convert to conversation format (oldest first)
        const conversation = [];
        sessions.reverse().forEach(session => {
          if (session.prompt) {
            conversation.push({
              role: 'user',
              content: session.prompt,
              timestamp: session.createdAt
            });
          }
          if (session.response) {
            conversation.push({
              role: 'assistant',
              content: session.response,
              timestamp: session.createdAt
            });
          }
        });
        return conversation;
      } catch (e) {
        console.warn('[MemoryManager] MongoDB getConversation failed, falling back:', e.message);
      }
    }
    
    // Fallback to in-memory
    if (!memoryStore.conversations.has(userId)) {
      memoryStore.conversations.set(userId, []);
    }
    return memoryStore.conversations.get(userId);
  }

  /**
   * Add message to conversation history
   */
  static async addToConversation(userId, role, content) {
    // First, handle in-memory for immediate access
    if (!memoryStore.conversations.has(userId)) {
      memoryStore.conversations.set(userId, []);
    }
    const conversation = memoryStore.conversations.get(userId);
    conversation.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    // Keep last 20 messages for short-term memory
    if (conversation.length > 20) {
      conversation.shift();
    }

    // Try to save to MongoDB if connected
    if (isMongoConnected() && VoiceSession && role === 'user') {
      try {
        // Save user message - we'll save the assistant response when generate is called
        // For now, we'll just create a session record
      } catch (e) {
        console.warn('[MemoryManager] MongoDB addToConversation failed:', e.message);
      }
    }
    
    return conversation;
  }

  /**
   * Save a complete voice interaction (user prompt + assistant response)
   */
  static async saveVoiceSession(userId, model, prompt, response) {
    // Update in-memory conversation
    await this.addToConversation(userId, 'user', prompt);
    await this.addToConversation(userId, 'assistant', response);

    // Try to save to MongoDB
    if (isMongoConnected() && VoiceSession) {
      try {
        await VoiceSession.create({
          userId,
          model,
          prompt,
          response
        });
      } catch (e) {
        console.warn('[MemoryManager] MongoDB saveVoiceSession failed:', e.message);
      }
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId) {
    if (isMongoConnected() && UserMemory) {
      try {
        let userMem = await UserMemory.findOne({ userId });
        if (!userMem) {
          userMem = await UserMemory.create({ userId });
        }
        return {
          userId,
          language: userMem.preferences.preferredLanguage || 'en',
          preferences: userMem.preferences,
          createdAt: userMem.createdAt
        };
      } catch (e) {
        console.warn('[MemoryManager] MongoDB getProfile failed, falling back:', e.message);
      }
    }
    
    // Fallback to in-memory
    if (!memoryStore.profiles.has(userId)) {
      memoryStore.profiles.set(userId, {
        userId,
        language: 'en',
        preferences: {},
        createdAt: new Date().toISOString()
      });
    }
    return memoryStore.profiles.get(userId);
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    // First update in-memory
    const profile = await this.getProfile(userId);
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    memoryStore.profiles.set(userId, profile);

    // Try to update in MongoDB
    if (isMongoConnected() && UserMemory) {
      try {
        const updateObj = {};
        if (updates.language) {
          updateObj['preferences.preferredLanguage'] = updates.language;
        }
        if (updates.preferences) {
          Object.keys(updates.preferences).forEach(key => {
            updateObj[`preferences.${key}`] = updates.preferences[key];
          });
        }
        if (Object.keys(updateObj).length > 0) {
          await UserMemory.findOneAndUpdate(
            { userId },
            updateObj,
            { upsert: true, new: true }
          );
        }
      } catch (e) {
        console.warn('[MemoryManager] MongoDB updateProfile failed:', e.message);
      }
    }
    
    return profile;
  }

  /**
   * Save important info to long-term memory
   */
  static async saveLongTerm(userId, key, value) {
    // First update in-memory
    if (!memoryStore.longTerm.has(userId)) {
      memoryStore.longTerm.set(userId, new Map());
    }
    const userLongTerm = memoryStore.longTerm.get(userId);
    userLongTerm.set(key, {
      value,
      timestamp: new Date().toISOString()
    });

    // Try to save to MongoDB
    if (isMongoConnected() && UserMemory) {
      try {
        const userMem = await UserMemory.findOne({ userId });
        if (userMem) {
          userMem.upsertFact(key, value);
          await userMem.save();
        } else {
          await UserMemory.create({
            userId,
            facts: [{ key, value, source: 'system', confidence: 1.0 }]
          });
        }
      } catch (e) {
        console.warn('[MemoryManager] MongoDB saveLongTerm failed:', e.message);
      }
    }
    
    return userLongTerm;
  }

  /**
   * Retrieve from long-term memory
   */
  static async getLongTerm(userId, key) {
    if (isMongoConnected() && UserMemory) {
      try {
        const userMem = await UserMemory.findOne({ userId });
        if (userMem) {
          const fact = userMem.facts.find(f => f.key === key);
          if (fact) {
            return fact;
          }
        }
      } catch (e) {
        console.warn('[MemoryManager] MongoDB getLongTerm failed, falling back:', e.message);
      }
    }
    
    // Fallback to in-memory
    const userLongTerm = memoryStore.longTerm.get(userId);
    if (!userLongTerm) return null;
    return userLongTerm.get(key);
  }

  /**
   * Get all memory context for a prompt
   */
  static async getContext(userId) {
    return {
      conversation: await this.getConversation(userId),
      profile: await this.getProfile(userId),
      longTerm: memoryStore.longTerm.get(userId) ? Object.fromEntries(memoryStore.longTerm.get(userId)) : {}
    };
  }

  /**
   * Clear conversation history
   */
  static async clearConversation(userId) {
    // Clear in-memory
    memoryStore.conversations.set(userId, []);
    
    // Try to clear from MongoDB (delete recent sessions)
    if (isMongoConnected() && VoiceSession) {
      try {
        await VoiceSession.deleteMany({ userId });
      } catch (e) {
        console.warn('[MemoryManager] MongoDB clearConversation failed:', e.message);
      }
    }
  }
}

module.exports = MemoryManager;
