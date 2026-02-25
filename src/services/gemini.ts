import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeFinancialReport = async (reportData: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `身為一位專業的財務顧問，請分析以下潛水店的財務報表數據，並提供繁體中文的洞察與建議。
請包含：
1. 營收與獲利狀況總結
2. 支出結構分析
3. 具體改善建議

財務數據：
${JSON.stringify(reportData, null, 2)}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
};
