
import { GoogleGenAI } from "@google/genai";
import { AnnotationProject } from "../types";
import { Locale } from "../translations";

export const analyzeAnnotations = async (project: AnnotationProject, locale: Locale): Promise<string> => {
  // CRITICAL: Instantiate inside the function to ensure process.env.API_KEY is current (obtained from environment)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textHighlights = project.textAnnotations.map(a => `"${a.text}" (Comment: ${a.comment || 'N/A'})`).join('\n');
  
  const languageName = locale === 'pt' ? 'Portuguese (Português)' : 'English';

  const prompt = `
    I have annotated a webpage about "${project.title}".
    
    Here are the text fragments I highlighted and my thoughts:
    ${textHighlights}
    
    The full content of the page starts with: "${project.content.substring(0, 1000)}..."
    
    Based on these specific annotations, can you:
    1. Summarize the core themes I'm focusing on.
    2. Suggest 3 follow-up questions or areas for deeper research based on my notes.
    3. Provide a critical insight connecting these highlights.

    IMPORTANT: You MUST provide the entire response in ${languageName}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze annotations. Please ensure your connection and environment configuration are correct.";
  }
};
