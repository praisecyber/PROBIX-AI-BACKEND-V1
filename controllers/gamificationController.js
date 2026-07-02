const fs = require("fs");
const path = require("path");
const UserStats = require("../models/UserStats");
const { User } = require("../models/User");
const { ProbixPredictor } = require("../nlp-predictor-pro/predictorModel");

const dictionaryPath = path.join(__dirname, '../nllb-translator/dictionary.json');

// Helper algorithm to calculate level (Level up every 100 XP)
const calculateLevel = (xp) => {
  return Math.floor(xp / 100) + 1;
};

// ─────────────────────────────────────────────
// @route   POST /api/gamification/complete-quest
// @desc    Grant XP & Streak for completing a translation/quest
// @access  Private (Requires JWT Token)
// ─────────────────────────────────────────────
const completeQuest = async (req, res) => {
  try {
    // Get the authenticated user's ID securely from the token
    const userId = req.user._id;
    const { xpReward = 50, isCorrect = true, sourceText, targetText, targetLangCode } = req.body;

    // Find the user to get their name if this is their first time playing
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Find or initialize user stats
    let userStats = await UserStats.findOne({ userId });

    if (!userStats) {
      userStats = new UserStats({
        userId,
        username: user.fullname,
        xp: 0,
        level: 1,
        streak: 0,
        totalInputs: 0,
        correctAnswers: 0,
        successRate: 0,
      });
    }

    // Update stats based on input
    userStats.totalInputs += 1;
    if (isCorrect) {
      userStats.correctAnswers += 1;
      userStats.xp += xpReward;
      userStats.streak += 1;
    }
    userStats.successRate = (userStats.correctAnswers / userStats.totalInputs) * 100;

    // Check for level up
    const newLevel = calculateLevel(userStats.xp);
    let leveledUp = false;

    if (newLevel > userStats.level) {
      userStats.level = newLevel;
      leveledUp = true;
    }

    await userStats.save();

    // ==========================================
    // 1. AI Learns from Input (Smart Dictionary)
    // ==========================================
    if (isCorrect && sourceText && targetText && targetLangCode) {
      try {
        let dictionary = [];
        if (fs.existsSync(dictionaryPath)) {
          dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
        }
        
        const dictIdx = dictionary.findIndex(d => d.en && d.en.toLowerCase() === sourceText.toLowerCase());
        const langMap = { 'yor_Latn': 'yo', 'ibo_Latn': 'ig', 'hau_Latn': 'ha', 'pcm_Latn': 'pcm', 'fra_Latn': 'fr', 'spa_Latn': 'es' };
        const key = langMap[targetLangCode] || targetLangCode;

        if (dictIdx !== -1) {
          dictionary[dictIdx][key] = targetText;
        } else {
          const newEntry = { en: sourceText };
          newEntry[key] = targetText;
          dictionary.push(newEntry);
        }
        
        fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2));
        console.log(`🧠 AI learned a new translation: "${sourceText}" -> "${targetText}"`);
      } catch (err) {
        console.error("Error updating dictionary:", err);
      }
    }

    // ==========================================
    // 2. AI Predicts Future Success Rate
    // ==========================================
    let predictedSuccessRate = null;
    let predictionMessage = "";
    try {
      const predictor = new ProbixPredictor();
      if (predictor.loadModel()) {
        const sample = {
          Pre_Semester_GPA: 3.0, // baseline
          Weekly_GenAI_Hours: userStats.totalInputs * 0.2, // Estimate AI usage
          Traditional_Study_Hours: userStats.streak * 0.5, // Estimate traditional study
          Perceived_AI_Dependency: 3,
          Anxiety_Level_During_Exams: 3,
          Skill_Retention_Score: userStats.successRate, // Pass their current success rate!
          Tool_Diversity: 1,
          Major_Category: 'Unknown',
          Year_of_Study: 'Unknown',
          Primary_Use_Case: 'Translation',
          Prompt_Engineering_Skill: userStats.level > 5 ? 'Advanced' : 'Beginner',
          Paid_Subscription: 'False',
          Institutional_Policy: 'Unknown',
          Age_Group: 'Unknown',
          Learning_Style: 'Unknown',
          Tech_Access_Level: 'High-Speed Internet',
          Native_Language: targetLangCode || 'Unknown'
        };
        const predictedGPA = predictor.predict(sample);
        // Map 0.0 - 4.0 GPA to a 0 - 100% Success Rate
        predictedSuccessRate = Math.min(100, Math.max(0, (predictedGPA / 4.0) * 100));
        
        if (predictedSuccessRate > 80) {
          predictionMessage = "🌟 AI Prediction: High Success! Your consistent practice is paying off.";
        } else if (predictedSuccessRate > 60) {
          predictionMessage = "📈 AI Prediction: Good progress, keep increasing your streak to improve further!";
        } else {
          predictionMessage = "⚠️ AI Prediction: Try to maintain a daily streak to improve your retention score.";
        }
      }
    } catch (err) {
      console.error("Prediction Error:", err);
    }

    return res.status(200).json({
      success: true,
      message: leveledUp ? "Level Up! Quest completed." : "Quest completed!",
      predictionMessage,
      data: {
        leveledUp,
        predictedSuccessRate: predictedSuccessRate ? parseFloat(predictedSuccessRate.toFixed(2)) : null,
        stats: userStats,
      },
    });
  } catch (error) {
    console.error("Complete Quest Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/gamification/leaderboard
// @desc    Get top users ranked by Study Streak and XP
// @access  Public or Private
// ─────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    // Fetch top users sorted descending by streak, then xp as tie-breaker
    const topUsers = await UserStats.find()
      .sort({ streak: -1, xp: -1 })
      .limit(limit)
      .select("userId username xp level streak -_id");

    return res.status(200).json({
      success: true,
      data: { leaderboard: topUsers },
    });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/gamification/my-stats
// @desc    Get current logged in user's gamification stats
// @access  Private
// ─────────────────────────────────────────────
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;
    // Let's create an empty stat object if they haven't done any quests yet
    let userStats = await UserStats.findOne({ userId });
    
    if (!userStats) {
      const user = await User.findById(userId);
      userStats = {
        userId,
        username: user ? user.fullname : "Unknown User",
        xp: 0,
        level: 1,
        streak: 0,
        totalInputs: 0,
        correctAnswers: 0,
        successRate: 0,
      };
    }

    return res.status(200).json({
      success: true,
      data: { stats: userStats },
    });
  } catch (error) {
    console.error("Get My Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

module.exports = { completeQuest, getLeaderboard, getMyStats };