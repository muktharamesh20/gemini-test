export interface Section {
	id: string;
	title: string;
	imageData: string; // base64 encoded image
	mimeType: string;
}

export interface Summaries {
	[sectionId: string]: string; // maps section ID to summary text
}

import { GeminiLLM, GeminiVision, ImagePart } from './gemini-llm';

export function toBase64ImagePartFromFile(filePath: string, mimeType: string): ImagePart {
	const fs = require('fs');
	const data = fs.readFileSync(filePath);
	return { dataBase64: data.toString('base64'), mimeType };
}

export async function extractTextFromImage(imageData: string, mimeType: string, vision: GeminiVision): Promise<string> {
	const ocrPrompt = [
		'You are extracting and translating handwritten class notes from an image.',
		'Return ONLY clean, readable text preserving math expressions and structure.',
		'Fix spelling, expand shorthand where obvious, and standardize notation.',
	].join(' ');

	const imagePart: ImagePart = { dataBase64: imageData, mimeType };
	const text = await vision.generateFromTextAndImages(ocrPrompt, [imagePart], 4000);
	console.log('Extracted text:', text.trim());
	return text.trim();
}

export class Summarizer {
    private sections: Section[] = [];
    private summaries: Summaries = {};

	createSection(title: string, imageData: string, mimeType: string): Section {
        const section: Section = {
			id: this.generateId('sec'),
			title,
			imageData,
			mimeType,
        };
		this.sections.push(section);
		return section;
	}

	getSections(): Section[] {
		return this.sections;
	}

	getSummaries(): Summaries {
		return this.summaries;
	}

	addSummaryDirectly(sectionId: string, summary: string): void {
		this.summaries[sectionId] = summary;
	}

	async addSummary(sectionId: string, vision: GeminiVision): Promise<string> {
		const section = this.requireSection(sectionId);
		const summary = await this.generateSummary(section, vision);
		this.summaries[sectionId] = summary;
		return summary;
	}

	async updateImage(sectionId: string, imageData: string, mimeType: string): Promise<void> {
		const section = this.requireSection(sectionId);
		section.imageData = imageData;
		section.mimeType = mimeType;
		// Remove existing summary since image changed
		delete this.summaries[sectionId];
	}

	async regenerateSummary(sectionId: string, vision: GeminiVision): Promise<string> {
		const section = this.requireSection(sectionId);
		const summary = await this.generateSummary(section, vision);
		this.summaries[sectionId] = summary;
		return summary;
	}

	async generateSummaryDirectly(section: Section, transcribedText: string, llm: GeminiLLM): Promise<string> {
		const summaryPrompt = [
			'Summarize the following notes to help a student understand the concept better.',
            'You will simply add helpful context, not repeat the notes.  On the app that this will appear on, you will be on a side bar next to the notes',
			'Include key steps, common pitfalls, and a tiny example if relevant.',
			'Keep it concise (<=5 bullet points). Input:',
			transcribedText,
		].join('\n');

		return (await llm.executeLLM(summaryPrompt)).trim();
	}

	private async generateSummary(section: Section, vision: GeminiVision): Promise<string> {
		const translatedText = await extractTextFromImage(section.imageData, section.mimeType, vision);

		const summaryPrompt = [
			'Summarize the following notes to help a student understand the concept better.',
            'You will simply add helpful context, not repeat the notes.  On the app that this will appear on, you will be on a side bar next to the notes',
			'Include key steps, common pitfalls, and a tiny example if relevant.',
			'Keep it concise (<=5 bullet points). Input:',
			translatedText,
		].join('\n');

		const llm = new GeminiLLM({ apiKey: (vision as any).apiKey });
		return (await llm.executeLLM(summaryPrompt)).trim();
	}



	private requireSection(sectionId: string): Section {
		const section = this.sections.find(s => s.id === sectionId);
		if (!section) throw new Error(`Section not found: ${sectionId}`);
		return section;
	}


	private generateId(prefix: string): string {
		const random = Math.random().toString(36).slice(2, 10);
		const ts = Date.now().toString(36);
		return `${prefix}_${ts}_${random}`;
	}
}
