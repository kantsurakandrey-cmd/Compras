
import { GoogleGenAI } from "@google/genai";

// AI analysis service for receipts
export const analyzeReceipt = async (base64Image: string): Promise<{ total?: number; items?: string[] }> => {
  // Always use new GoogleGenAI({ apiKey: process.env.API_KEY })
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image
            }
          },
          {
            text: "Analyze this construction receipt. Extract the total price and a list of items bought. Return ONLY a JSON object with keys 'total' (number) and 'items' (array of strings). Try to find values in any language, especially Russian if present."
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    // response.text is a property
    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Error analyzing receipt with Gemini:", error);
  }
  return {};
};
