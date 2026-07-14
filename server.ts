import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;

// Helper function to call Gemini API with exponential backoff and fallback model
async function generateContentWithRetry(ai: any, options: {
  model: string;
  contents: any[];
  config: any;
}) {
  const modelsToTry = [options.model, "gemini-flash-lite-latest", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 2; // 2 attempts per model to keep it responsive
    let delay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 [Model: ${model}] [Attempt ${attempt}/${maxRetries}] Calling Gemini API...`);
        const response = await ai.models.generateContent({
          ...options,
          model: model
        });
        return response;
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.status_code;
        const message = error?.message || "";
        console.warn(`⚠️ Error on model "${model}", attempt ${attempt} (Status: ${status}):`, message);
        
        // If it's a 404 (model not found), switch to fallback model immediately
        if (status === 404 || message.includes("404") || message.includes("not found") || message.includes("no longer available")) {
          console.log(`❌ Model "${model}" not found or restricted (404), switching to fallback model immediately...`);
          break;
        }

        // For other errors (like 503, 429), we wait and retry
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // exponential backoff
        }
      }
    }
  }
  
  throw lastError || new Error("Failed to scan receipt after trying all models and retries.");
}

async function startServer() {
  const app = express();

  // Support large base64 payloads for image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Scan Receipt
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        res.status(400).json({ error: "Missing image data in request" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("⚠️ GEMINI_API_KEY is not configured in environment variables.");
        res.status(400).json({ 
          error: "GEMINI_API_KEY_MISSING",
          message: "Пожалуйста, добавьте GEMINI_API_KEY в настройках (секретных переменных) приложения для распознавания чеков через ИИ."
        });
        return;
      }

      console.log("📸 Initiating Gemini receipt scanning...");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Clean base64 string if it contains prefix
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `
        Ты — интеллектуальный ассистент по распознаванию строительных чеков.
        Проанализируй предоставленное изображение чека и извлеки следующие структурированные данные на русском языке:
        1. Название магазина (например, "OBRAMAT", "Leroy Merlin", "Bricomart" или др.).
        2. Итоговая сумма чека (число, например 45.90).
        3. Примерная дата покупки в формате Timestamp (миллисекунды с эпохи Unix). Если дата не видна или не распознана, верни текущее время: ${Date.now()}.
        4. Список купленных товаров: для каждого товара укажи:
           - название (переведи на русский или оставь оригинальное испанское название, если так понятнее, например "Арматура Ø12мм" или "Cemento CEM II")
           - количество (например "10 шт", "3 мешка" или "1")
           - стоимость/цену этой позиции как число (например, 5.68 или 12.00) в поле "price". Если цена не указана, не заполняй это поле или укажи null.
        
        Верни ответ строго в формате JSON, соответствующем заданной схеме.
      `;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/jpeg"
            }
          },
          prompt
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              shopName: { type: "STRING" },
              totalAmount: { type: "NUMBER" },
              date: { type: "NUMBER" },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    quantity: { type: "STRING" },
                    price: { type: "NUMBER" }
                  },
                  required: ["name", "quantity"]
                }
              }
            },
            required: ["shopName", "totalAmount", "items"]
          }
        }
      });

      const responseText = response.text;
      console.log("🤖 Gemini scan response:", responseText);

      if (!responseText) {
        res.status(500).json({ error: "Failed to get response from Gemini model" });
        return;
      }

      const parsedData = JSON.parse(responseText);
      res.json(parsedData);

    } catch (error: any) {
      console.error("❌ Error scanning receipt via Gemini:", error);
      res.status(500).json({ 
        error: "INTERNAL_ERROR", 
        message: error?.message || "Не удалось обработать чек" 
      });
    }
  });

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite Integration & Routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
