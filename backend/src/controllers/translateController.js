const axios = require("axios");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
let currentKeyIndex = 0;

function getGeminiApiKeys() {
  return String(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(/[\s,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getGeminiModels() {
  const configured = String(process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "")
    .split(/[\s,;]+/)
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set([...configured, "gemini-2.5-flash-lite", "gemini-2.5-flash"])];
}

function nextKey(keys) {
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
}

function isQuotaError(error) {
  const status = error?.response?.status;
  return status === 403 || status === 429;
}

function isTemporaryModelError(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.error?.message || error?.message || "").toLowerCase();
  return status === 503 || message.includes("high demand") || message.includes("temporarily");
}

function parseDataUrl(dataUrl = "") {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2]
  };
}

function parseGeminiJson(text = "") {
  const clean = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned an invalid JSON response");
    return JSON.parse(match[0]);
  }
}

async function callGemini(parts) {
  const keys = getGeminiApiKeys();
  if (!keys.length) {
    const error = new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS in backend .env");
    error.statusCode = 500;
    throw error;
  }

  const models = getGeminiModels();
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < keys.length; attempt += 1) {
      const key = keys[currentKeyIndex % keys.length];

      try {
        const response = await axios.post(
          `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
          {
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            },
            contents: [
              {
                role: "user",
                parts
              }
            ]
          },
          {
            params: { key },
            timeout: 60000
          }
        );

        const text = response.data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (!text) throw new Error("Gemini returned an empty response");
        return parseGeminiJson(text);
      } catch (error) {
        lastError = error;
        if (isQuotaError(error) && keys.length > 1) {
          nextKey(keys);
          continue;
        }
        if (isTemporaryModelError(error)) {
          break;
        }
        throw error;
      }
    }
  }

  const error = new Error(lastError?.response?.data?.error?.message || "All Gemini API keys failed");
  error.statusCode = lastError?.response?.status || 500;
  throw error;
}

function translationPrompt({ mode, text }) {
  return `
You are a Vietnamese-English translation assistant.

Rules:
- Detect the source language automatically.
- If the source is Vietnamese, translate to English.
- If the source is English, translate to Vietnamese.
- If the source mixes Vietnamese and English, translate to the language that best helps the user understand the full text.
- Preserve names, URLs, IDs, numbers, line breaks, and formatting where possible.
- Return only valid JSON with these exact keys:
  {
    "detectedLanguage": "Vietnamese|English|Mixed|Unknown",
    "targetLanguage": "Vietnamese|English",
    "sourceText": "original extracted or submitted text",
    "translatedText": "translation"
  }

Mode: ${mode}
Text:
${text || ""}
`.trim();
}

exports.translateText = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const result = await callGemini([{ text: translationPrompt({ mode: "text", text }) }]);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error?.message || error.message || "Could not translate text"
    });
  }
};

exports.translateImage = async (req, res) => {
  try {
    const image = parseDataUrl(req.body?.imageDataUrl);
    if (!image) {
      return res.status(400).json({ success: false, message: "A valid image data URL is required" });
    }

    const result = await callGemini([
      {
        text: translationPrompt({
          mode: "image OCR",
          text: "Extract all readable text from this image first, then translate it."
        })
      },
      {
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      }
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error?.message || error.message || "Could not read and translate image"
    });
  }
};
