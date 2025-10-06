export interface Section {
  id: string;
  title: string;
  imageData: string; // base64 encoded image
  mimeType: string;
}

export interface Summaries {
  [sectionId: string]: string; // maps section ID to summary text
}

import { GeminiLLM, ImagePart } from "./gemini-llm";

export class Summarizer {
  private summaries: Summaries = {};

  getSummaries(): Summaries {
    return this.summaries;
  }

  setSummary(sectionId: Section, summary: string): void {
    this.summaries[sectionId.id] = summary;
  }

  async setSummaryWithAI(
    section: Section,
    transcribedText: string,
    llm: GeminiLLM
  ): Promise<string> {
    const summaryPrompt = [
      `Summarize the following notes to help a student understand the concept better.
	If you detect that your summary might not match the topic or meaning of the notes, do not output a summary — instead, respond with:
	"The summary could not be generated because the content was unclear or unrelated."
	Provide only the summary itself, with no meta-language.
	Write bullet points that highlight key ideas, steps, or common mistakes,
	but make it like a table of contents and keep it very concise.
	Again, to reiterate, keep it as concise as possible, making it at most 40% of the total transcript length.
	Try writing 3–5 bullet points total.
	Make sure that you only add high level concepts, not detailed steps.
	Keep it accurate, relevant, and tied directly to the notes provided.`,
      transcribedText,
    ].join("\n");

    const summary = (await llm.executeLLM(summaryPrompt)).trim();

    // Validate the generated summary
    try {
      this.validateSummary(summary, transcribedText);
    } catch (error) {
      const summary = (await llm.executeLLM(summaryPrompt)).trim();
      this.validateSummary(summary, transcribedText);
    }

    // Add the summary to the summaries
    this.setSummary(section, summary);

    return summary;
  }

  private validateSummary(summary: string, originalText: string): void {
    // Validator 1: Check summary length (should not be too long relative to original)
    this.validateSummaryLength(summary, originalText);

    // Validator 2: Check for content relevance
    this.validateContentRelevance(summary, originalText);

    // Validator 3: Check for meta-language
    this.validateNoMetaLanguage(summary);
  }

  private validateSummaryLength(
    summary: string,
    originalText: string,
    maxLengthRatio: number = 0.6
  ): void {
    const originalWords = originalText.split(/\s+/).length;
    const summaryWords = summary.split(/\s+/).length;
    const ratio = summaryWords / originalWords;

    if (ratio > maxLengthRatio && summaryWords > 150) {
      throw new Error(
        `SummaryTooLongError: Summary is ${(ratio * 100).toFixed(
          1
        )}% of original text length (${summaryWords}/${originalWords} words). Maximum allowed: ${(
          maxLengthRatio * 100
        ).toFixed(1)}%`
      );
    }
  }

  private validateContentRelevance(
    summary: string,
    originalText: string
  ): void {
    // Extract meaningful words (4+ characters) from both texts
    const extractWords = (text: string) =>
      new Set(text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);

    const originalWords = extractWords(originalText);
    const summaryWords = extractWords(summary);

    // Find overlap between summary and original text
    const overlap = [...summaryWords].filter((word) => originalWords.has(word));
    const overlapRatio =
      summaryWords.size > 0 ? overlap.length / summaryWords.size : 0;

    if (overlapRatio < 0.2) {
      throw new Error(
        `ContentRelevanceError: Summary appears unrelated to source text. Only ${(
          overlapRatio * 100
        ).toFixed(1)}% of summary words overlap with original content.`
      );
    }
  }

  private validateNoMetaLanguage(summary: string): void {
    const metaPatterns = [
      "as an ai",
      "i am an ai",
      "i'm an ai",
      "as a language model",
      "i cannot",
      "i'm not able to",
      "i don't have the ability",
      "i'm sorry, but",
      "unfortunately, i",
      "i would need more information",
      "here's a summary",
      "in summary",
      "this text discusses",
      "overall, the passage talks about",
      "the following is a summary",
      "this is a summary",
      "the summary of",
      "to summarize",
      "in conclusion",
    ];

    const summaryLower = summary.toLowerCase();
    const foundPatterns = metaPatterns.filter((pattern) =>
      summaryLower.includes(pattern)
    );

    if (foundPatterns.length > 0) {
      throw new Error(
        `MetaLanguageError: Found AI meta-language: ${foundPatterns.join(", ")}`
      );
    }
  }
}
