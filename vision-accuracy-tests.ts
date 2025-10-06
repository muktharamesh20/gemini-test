import { GeminiLLM, Config, GeminiVision, ImagePart } from "./gemini-llm";
import { TestVisionShim } from "./vision";

async function extractTextFromImage(imageData: string, mimeType: string, vision: GeminiVision): Promise<string> {
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

function toBase64ImagePartFromFile(filePath: string, mimeType: string): ImagePart {
	const fs = require('fs');
	const data = fs.readFileSync(filePath);
	return { dataBase64: data.toString('base64'), mimeType };
}

function loadConfig(): Config {
  try {
    const config = require("../config.json");
    return config;
  } catch (error) {
    console.error(
      "❌ Error loading config.json. Please ensure it exists with your API key or set GEMINI_API_KEY."
    );
    console.error("Error details:", (error as Error).message);
    const fromEnv = process.env.GEMINI_API_KEY;
    if (fromEnv && fromEnv.trim()) return { apiKey: fromEnv.trim() } as Config;
    process.exit(1);
  }
}

// Pre-recorded expected transcriptions for comparison
const expectedTranscriptions = {
  "notes1.png": `## Lecture 8: Gaussian Elimination

Last Time: $Ax=b$, used Gaussian elimination + back-substitution to solve for $x$. We had a unique solution last time, but we will see other cases.

This time: Gaussian elimination with matrix multiplication (instead of a system of equations).

$Ax=b$
or
$(A|b)$

The augmented matrix:
$$ \\left( \\begin{array}{ccc|c} 1 & -1 & 2 & 1 \\\\ -2 & 2 & -3 & -1 \\\\ -3 & -1 & 2 & -3 \\end{array} \\right) $$
The elements $1, -2, -3$ in the first column are the initial *pivots*.

**Step 1:** Eliminate all elements except the first column pivot.

The new first equation will be exactly the same as the old one.
To eliminate elements in the first column below the pivot, we use the elementary matrix $G_1$:
$$ G_1 = \\begin{pmatrix} 1 & 0 & 0 \\\\ 2 & 1 & 0 \\\\ 3 & 0 & 1 \\end{pmatrix} $$
Applying $G_1$ to the augmented matrix $(A|b)$:
$$ \\begin{pmatrix} 1 & 0 & 0 \\\\ 2 & 1 & 0 \\\\ 3 & 0 & 1 \\end{pmatrix} \\left( \\begin{array}{ccc|c} 1 & -1 & 2 & 1 \\\\ -2 & 2 & -3 & -1 \\\\ -3 & -1 & 2 & -3 \\end{array} \\right) = \\left( \\begin{array}{ccc|c} 1 & -1 & 2 & 1 \\\\ 0 & 0 & 1 & 1 \\\\ 0 & -4 & 8 & 0 \\end{array} \\right) $$
The resulting matrix parts are $G_1 A$ and $G_1 b$.

**Step 2:** Swap rows 2 and 3.

We use the elementary matrix $G_2$ for the row swap:
$$ G_2 = \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 0 & 1 \\\\ 0 & 1 & 0 \\end{pmatrix} $$
Applying $G_2$ to the previous result $(G_1 A | G_1 b)$:
$$ \\left( \\begin{array}{ccc|c} 1 & -1 & 2 & 1 \\\\ 0 & -4 & 8 & 0 \\\\ 0 & 0 & 1 & 1 \\end{array} \\right) $$
The resulting matrix parts are $G_2 G_1 A$ and $G_2 G_1 b$.

This final matrix is in **REF FORM!** (Row Echelon Form).
This transformed augmented matrix is called $(\\tilde{A}|\\tilde{b})$.`,

  "notes2.png": `Think of the "denominator" as the total number of equal parts something is divided into, and the "numerator" as how many of those parts you have or are considering.

When comparing or adding fractions, you MUST have the same "size" of parts (same denominator). This often means finding a "common denominator."

Students sometimes try to add or subtract numerators and denominators directly without finding a common denominator, leading to incorrect answers.

Imagine a pizza cut into 8 slices. If you eat 3 slices, you've eaten 3/8 of the pizza. The 8 is the total slices (denominator), and the 3 is how many you ate (numerator).`,
};

// Key terms to look for in transcriptions
const keyTerms = {
  "notes1.png": [
    "Gaussian",
    "elimination",
    "matrix",
    "pivot",
    "REF",
    "echelon",
    "augmented",
    "elementary",
  ],
  "notes2.png": [
    "denominator",
    "numerator",
    "fractions",
    "common",
    "pizza",
    "slices",
  ],
};

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - convert to lowercase and split on non-alphanumeric
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3); // Filter out short words
}

function calculateKeywordMatch(
  actual: string,
  expected: string,
  keyTerms: string[]
): { score: number; matched: string[]; missing: string[] } {
  const actualKeywords = extractKeywords(actual);
  const expectedKeywords = extractKeywords(expected);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const term of keyTerms) {
    const termLower = term.toLowerCase();
    const foundInActual = actualKeywords.some((keyword) =>
      keyword.includes(termLower)
    );
    const foundInExpected = expectedKeywords.some((keyword) =>
      keyword.includes(termLower)
    );

    if (foundInActual && foundInExpected) {
      matched.push(term);
    } else if (foundInExpected && !foundInActual) {
      missing.push(term);
    }
  }

  const score = matched.length / keyTerms.length;
  return { score, matched, missing };
}

async function testVisionAccuracy(imagePath: string) {
  const config = loadConfig();
  const vision = new TestVisionShim(config.apiKey);

  console.log(`\n=== Testing Vision Accuracy for ${imagePath} ===`);

  // Get expected transcription
  const expected =
    expectedTranscriptions[imagePath as keyof typeof expectedTranscriptions];
  if (!expected) {
    console.error(`No expected transcription found for ${imagePath}`);
    return;
  }

  // Get actual transcription
  const lower = imagePath.toLowerCase();
  const mimeType = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";
  const img = toBase64ImagePartFromFile(imagePath, mimeType);

  console.log("Extracting text from image...");
  const actual = await extractTextFromImage(
    img.dataBase64,
    img.mimeType,
    vision
  );

  // Calculate keyword match
  const keyTermsForImage = keyTerms[imagePath as keyof typeof keyTerms] || [];
  const match = calculateKeywordMatch(actual, expected, keyTermsForImage);

  console.log(`\n--- Results ---`);
  console.log(`Keyword Match Score: ${(match.score * 100).toFixed(1)}%`);
  console.log(`Matched Keywords: ${match.matched.join(", ")}`);
  console.log(`Missing Keywords: ${match.missing.join(", ")}`);

  console.log(`\n--- Actual Transcription ---`);
  console.log(actual);

  console.log(`\n--- Expected Transcription ---`);
  console.log(expected);

  return {
    imagePath,
    score: match.score,
    matched: match.matched,
    missing: match.missing,
    actual,
    expected,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npm run vision:test -- <image1> [image2 ...]");
    console.error("Available test images: notes1.png, notes2.png");
    process.exit(1);
  }

  console.log("=== Vision Accuracy Testing ===");
  console.log(
    "Testing OCR accuracy by comparing key terms in actual vs expected transcriptions\n"
  );

  const results = [];

  for (const imagePath of args) {
    try {
      const result = await testVisionAccuracy(imagePath);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error testing ${imagePath}:`, error);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  if (results.length > 0) {
    const avgScore =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;
    console.log(`Average Keyword Match Score: ${(avgScore * 100).toFixed(1)}%`);

    console.log("\nIndividual Results:");
    results.forEach((result) => {
      console.log(
        `${result.imagePath}: ${(result.score * 100).toFixed(1)}% (${
          result.matched.length
        }/${result.matched.length + result.missing.length} keywords)`
      );
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
