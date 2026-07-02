const { askGeminiMath, extractJsonObject } = require("../utils/geminiClient");
const { verifyStep } = require("../utils/mathServiceClient");

exports.geminiMathTutor = async (req, res) => {
  try {
    // Check if body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty or not valid JSON. Ensure 'Content-Type: application/json' header is set.",
      });
    }

    const { question, language = "English", verify = true } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        success: false,
        message: "A question string is required for Gemini math/STEM mode.",
      });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message:
          "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY (or OPENAI_API_KEY) before using Gemini math/STEM mode.",
      });
    }

    const geminiResponse = await askGeminiMath({ question, language });
    const parsedAnswer = extractJsonObject(geminiResponse);
    const verificationResults = [];

    if (verify && parsedAnswer?.steps && Array.isArray(parsedAnswer.steps)) {
      for (const step of parsedAnswer.steps) {
        if (!step || typeof step.expression !== "string") {
          verificationResults.push({
            step_id: step?.step_id || null,
            ok: false,
            reason: "missing_expression",
            details: {
              message:
                "Unable to verify this step because it did not contain a valid expression.",
              step,
            },
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
          verificationResults.push(result);
        } catch (error) {
          verificationResults.push({
            step_id: step.step_id || null,
            ok: false,
            reason: "service_error",
            details: {
              error: error.message,
            },
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        geminiModel: "gemini-3.1-flash",
        question,
        language,
        verifyMath: verify,
        rawResponse: geminiResponse,
        structuredAnswer: parsedAnswer,
        verificationResults,
      },
    });
  } catch (error) {
    console.error("Gemini Math Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Gemini math/STEM request failed.",
      error: error.message,
    });
  }
};
