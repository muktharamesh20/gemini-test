export interface PageImage {
	title?: string;
	dataBase64: string;
	mimeType: string;
}

export interface Page {
	id: string;
	image: PageImage;
	translatedText: string;
	pageSummary: string;
}

export interface Section {
	id: string;
	topic: string;
	pages: Page[];
	summary: string;
}

import { GeminiLLM, GeminiVision, ImagePart } from './gemini-llm';

export function toBase64ImagePartFromFile(filePath: string, mimeType: string): ImagePart {
	const fs = require('fs');
	const data = fs.readFileSync(filePath);
	return { dataBase64: data.toString('base64'), mimeType };
}

export class Summarizer {
    private sections: Section[] = [];

	createSection(topic: string): Section {
        const section: Section = {
			id: this.generateId('sec'),
			topic,
			pages: [],
            summary: '',
        };
		this.sections.push(section);
		return section;
	}

	getSections(): Section[] {
		return this.sections;
	}

	async addPageAndProcess(sectionId: string, image: PageImage, vision: GeminiVision): Promise<Page> {
		const section = this.requireSection(sectionId);
		const page: Page = {
			id: this.generateId('pg'),
			image,
			translatedText: '',
			pageSummary: '',
		};
		section.pages.push(page);
		await this.processPageAndUpdateSection(section, page, vision);
		return page;
	}

	async updatePageImage(sectionId: string, pageId: string, image: PageImage, vision: GeminiVision): Promise<Page> {
		const section = this.requireSection(sectionId);
		const page = this.requirePage(section, pageId);
		page.image = image;
		await this.processPageAndUpdateSection(section, page, vision);
		return page;
	}

	async regenerateSectionSummary(sectionId: string, llm: GeminiLLM): Promise<string> {
		const section = this.requireSection(sectionId);
		section.summary = await this.generateSectionSummary(section, llm);
		return section.summary;
	}

	private async processPageAndUpdateSection(section: Section, page: Page, vision: GeminiVision): Promise<void> {
		const ocrPrompt = [
			'You are extracting and translating handwritten class notes from an image.',
			'Return ONLY clean, readable text preserving math expressions and structure.',
			'Fix spelling, expand shorthand where obvious, and standardize notation.',
		].join(' ');

		const text = await vision.generateFromTextAndImages(ocrPrompt, [this.toImagePart(page.image)], 4000);
		page.translatedText = text.trim();

		const pageSummaryPrompt = [
			'Summarize the following notes to help a student understand the concept better.',
            'You will simply add helpful context, not repeat the notes.  On the app that this will appear on, you will be on a side bar next to the notes',
			'Include key steps, common pitfalls, and a tiny example if relevant.',
			'Keep it concise (<=5 bullet points). Input:',
			page.translatedText,
		].join('\n');

		const llm = new GeminiLLM({ apiKey: (vision as any).apiKey });
		page.pageSummary = (await llm.executeLLM(pageSummaryPrompt)).trim();

		section.summary = await this.generateSectionSummary(section, llm);
	}

	private async generateSectionSummary(section: Section, llm: GeminiLLM): Promise<string> {
		const joined = section.pages
			.map((p, i) => `Page ${i + 1}${p.image.title ? ` (${p.image.title})` : ''}:\n${p.translatedText}`)
			.join('\n\n');

		const prompt = [
			`Topic: ${section.topic}`,
			'You are a helpful tutor. Using all the notes below, write a helpful sidebar section to help the student get a little extra insight into what they are learning.:',
            'Summarize the following notes to help a student understand the concept better.',
            'You will simply add helpful context, not repeat the notes.  On the app that this will appear on, you will be on a side bar next to the notes',
			'Include key steps, common pitfalls, and a tiny example if relevant.',
			'Keep it concise (<=5 bullet points). ',
			'Include key steps, common pitfalls, and a tiny example if relevant. Input:',
			joined,
		].join('\n');

		const summary = await llm.executeLLM(prompt);
		return summary.trim();
	}

	private toImagePart(img: PageImage): ImagePart {
		return { dataBase64: img.dataBase64, mimeType: img.mimeType };
	}

	private requireSection(sectionId: string): Section {
		const section = this.sections.find(s => s.id === sectionId);
		if (!section) throw new Error(`Section not found: ${sectionId}`);
		return section;
	}

	private requirePage(section: Section, pageId: string): Page {
		const page = section.pages.find(p => p.id === pageId);
		if (!page) throw new Error(`Page not found: ${pageId}`);
		return page;
	}

	private generateId(prefix: string): string {
		const random = Math.random().toString(36).slice(2, 10);
		const ts = Date.now().toString(36);
		return `${prefix}_${ts}_${random}`;
	}
}
