
import { GoogleGenAI, Type } from "@google/genai";

// AI analysis service for receipts
export const analyzeReceipt = async (base64Image: string): Promise<{ total?: number; items?: string[] }> => {
  // Always use new GoogleGenAI({ apiKey: process.env.API_KEY })
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-pro-preview for complex reasoning tasks such as structured receipt analysis.
  const model = 'gemini-3-pro-preview';

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
            text: "Analyze this construction receipt. Extract the total price and a list of items bought. Try to find values in any language, especially Russian if present."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        // Using responseSchema for better reliability in structured data extraction as recommended by Google GenAI guidelines.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            total: {
              type: Type.NUMBER,
              description: 'The total price on the receipt.',
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'The list of items bought.',
            },
          },
          propertyOrdering: ["total", "items"],
        },
      }
    });

    // response.text is a property containing the generated JSON string.
    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Error analyzing receipt with Gemini:", error);
  }
  return {};
};
