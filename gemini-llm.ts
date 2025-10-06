/**
 * LLM Integration for DayPlanner
 * 
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash-lite", 
                generationConfig: {
                    maxOutputTokens: 1000,
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;            
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}

export interface ImagePart {
    dataBase64: string;
    mimeType: string;
}

export class GeminiVision {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async generateFromTextAndImages(prompt: string, images: ImagePart[], maxOutputTokens: number = 2000): Promise<string> {
        try {
            const genAI = new GoogleGenerativeAI(this.apiKey);
            // Using a multimodal-capable model
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    maxOutputTokens,
                },
            });

            const parts = [
                { text: prompt },
                ...images.map(img => ({ inlineData: { data: img.dataBase64, mimeType: img.mimeType } }))
            ];

            const result = await model.generateContent({ contents: [{ role: "user", parts }] });
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Error calling Gemini multimodal API:', (error as Error).message);
            throw error;
        }
    }
}
