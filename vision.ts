import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiVision, ImagePart, Config } from './gemini-llm';

// Multimodal vision shim using a supported model, separate from gemini-llm.ts
export class TestVisionShim extends GeminiVision {
	constructor(apiKey: string) {
		super({ apiKey });
	}
	
	async generateFromTextAndImages(prompt: string, images: ImagePart[], maxOutputTokens: number = 2000): Promise<string> {
		const genAI = new GoogleGenerativeAI((this as any).apiKey);
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.5-flash',
			generationConfig: { maxOutputTokens },
		});
		const parts = [
			{ text: prompt },
			...images.map(img => ({ inlineData: { data: img.dataBase64, mimeType: img.mimeType } })),
		];
		const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
		return result.response.text();
	}
}
