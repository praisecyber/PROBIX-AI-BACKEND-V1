const { ProbixTranslator } = require("../nllb-translator/translatorModel");
const { verifyStep } = require("../utils/mathServiceClient");
const { buildBrainEnhancedTranslation } = require("../utils/translationBrain");

let translatorInstance = null;

/**
 * Initialize and get the translator instance
 */
const getTranslator = async () => {
  if (!translatorInstance) {
    translatorInstance = new ProbixTranslator();
    await translatorInstance.loadModel();
  }
  return translatorInstance;
};

/**
 * @desc    Translate text
 * @route   POST /api/translate
 * @access  Public (or Protected depending on your needs)
 */
exports.translateText = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty or not valid JSON. Ensure 'Content-Type: application/json' header is set.",
      });
    }

    const { text, sourceLang, targetLang } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text to translate is required",
      });
    }

    const translator = await getTranslator();
    
    // Default source to English if not provided
    const source = sourceLang || "eng_Latn";
    // Default target to Yoruba if not provided
    const target = targetLang || "yor_Latn";

    const translation = await translator.translate(text, source, target);
    const enhancedTranslation = await buildBrainEnhancedTranslation({
      text,
      sourceLang: source,
      targetLang: target,
      translation,
      useBrain: true,
    });

    res.status(200).json({
      success: true,
      data: {
        originalText: text,
        translatedText: enhancedTranslation,
        sourceLang: source,
        targetLang: target,
      },
    });
  } catch (error) {
    console.error("Translation Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Translation failed",
      error: error.message,
    });
  }
};

/**
 * @desc    Get supported languages
 * @route   GET /api/translate/languages
 * @access  Public
 */
exports.getSupportedLanguages = (req, res) => {
  try {
    const languages = require("../nllb-translator/languages_full.json").languages;
    res.status(200).json({
      success: true,
      count: languages.length,
      data: languages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not retrieve languages",
    });
  }
};

/**
 * @desc    Verify an array of math steps using the Python math microservice.
 * @route   POST /api/translate/verify-steps
 * @access  Public
 */
exports.verifySteps = async (req, res) => {
  try {
    // Check if body exists (body-parser might not have parsed it if Content-Type was wrong)
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty or not valid JSON. Ensure 'Content-Type: application/json' header is set.",
      });
    }

    const { steps } = req.body;

    if (!steps) {
      return res.status(400).json({
        success: false,
        message: "The 'steps' field is required in the request body.",
      });
    }

    if (!Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        message: "The 'steps' field must be an array.",
      });
    }

    if (steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A non-empty array of steps is required.",
      });
    }

    const checks = [];

    for (const step of steps) {
      if (!step || typeof step.expression !== "string") {
        checks.push({
          step_id: step?.step_id || null,
          ok: false,
          reason: "invalid_step",
          details: { message: "Each step must include an expression string." },
        });
        continue;
      }

      try {
        const result = await verifyStep({
          step_id: step.step_id || null,
          expression: step.expression,
          expected: step.expected || null,
          variables: step.variables || null,
        });
        checks.push(result);
      } catch (error) {
        checks.push({
          step_id: step.step_id || null,
          ok: false,
          reason: "service_error",
          details: { error: error.message },
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        checks,
      },
    });
  } catch (error) {
    console.error("Verify Steps Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Step verification failed.",
      error: error.message,
    });
  }
};

/**
 * @desc    Translate text and verify any detected math expressions.
 * @route   POST /api/translate/verify
 * @access  Public
 */
exports.translateAndVerify = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty or not valid JSON. Ensure 'Content-Type: application/json' header is set.",
      });
    }

    const { text, sourceLang, targetLang } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text to translate is required.",
      });
    }

    const translator = await getTranslator();
    const source = sourceLang || "eng_Latn";
    const target = targetLang || "yor_Latn";

    const verificationResult = await translator.translateAndVerify(text, source, target);

    res.status(200).json({
      success: true,
      data: {
        originalText: text,
        translatedText: verificationResult.translation,
        sourceLang: source,
        targetLang: target,
        mathChecks: verificationResult.math_checks,
      },
    });
  } catch (error) {
    console.error("Translate and Verify Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Translation and verification failed.",
      error: error.message,
    });
  }
};
