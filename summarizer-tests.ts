import { Summarizer, toBase64ImagePartFromFile } from './summarizer';
import { GeminiLLM, Config } from './gemini-llm';
import { GoogleGenerativeAI } from '@google/generative-ai';

function loadConfig(): Config {
	try {
		const config = require('../config.json');
		return config;
	} catch (error) {
		console.error('❌ Error loading config.json. Please ensure it exists with your API key or set GEMINI_API_KEY.');
		console.error('Error details:', (error as Error).message);
		const fromEnv = process.env.GEMINI_API_KEY;
		if (fromEnv && fromEnv.trim()) return { apiKey: fromEnv.trim() } as Config;
		process.exit(1);
	}
}

// Multimodal vision shim using a supported model, separate from gemini-llm.ts
class TestVisionShim {
	private apiKey: string;
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}
	async generateFromTextAndImages(prompt: string, images: { dataBase64: string; mimeType: string; }[], maxOutputTokens: number = 2000): Promise<string> {
		const genAI = new GoogleGenerativeAI(this.apiKey);
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

async function main() {
	const config = loadConfig();
	const vision = new TestVisionShim(config.apiKey);
	const llm = new GeminiLLM({ apiKey: config.apiKey });

	const summarizer = new Summarizer();
	const section = summarizer.createSection(process.argv[2] || '');

	const imageArgs = process.argv.slice(3);
	if (imageArgs.length === 0) {
		console.error('Usage: npm run summarize:pages -- <topic> <image1> [image2 ...]');
		process.exit(1);
	}

	for (const imagePath of imageArgs) {
		const lower = imagePath.toLowerCase();
		const mimeType = lower.endsWith('.png') ? 'image/png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'image/jpeg' : 'image/png';
		const img = toBase64ImagePartFromFile(imagePath, mimeType);
		await summarizer.addPageAndProcess(section.id, { title: imagePath, dataBase64: img.dataBase64, mimeType: img.mimeType }, vision as any);
		console.log(`Processed page: ${imagePath}`);
	}

	console.log('\n=== SECTION SUMMARY ===');
	console.log(section.summary);

	console.log('\n=== PAGE SUMMARIES ===');
	for (const p of section.pages) {
		console.log(`\n# ${p.image.title || p.id}`);
		console.log(p.pageSummary);
	}

	console.log('\n=== FULL PAGE TEXTS ===');
	for (const p of section.pages) {
		console.log(`\n# ${p.image.title || p.id}`);
		console.log(p.translatedText);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
