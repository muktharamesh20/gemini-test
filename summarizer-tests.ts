import { Summarizer, toBase64ImagePartFromFile, extractTextFromImage } from './summarizer';
import { GeminiLLM, Config } from './gemini-llm';
import { TestVisionShim } from './vision';

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

// Test function that uses pre-transcribed text instead of calling vision API
async function testSummarizationWithPreTranscribedText() {
	const config = loadConfig();
	const llm = new GeminiLLM({ apiKey: config.apiKey });
	const summarizer = new Summarizer();

	// Test case 1: Gaussian Elimination notes
	const gaussianNotes = `## Lecture 8: Gaussian Elimination

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
This transformed augmented matrix is called $(\\tilde{A}|\\tilde{b})$.`;

	// Test case 2: Fractions notes (from notes2.png transcription)
	const fractionsNotes = `Think of the "denominator" as the total number of equal parts something is divided into, and the "numerator" as how many of those parts you have or are considering.

When comparing or adding fractions, you MUST have the same "size" of parts (same denominator). This often means finding a "common denominator."

Students sometimes try to add or subtract numerators and denominators directly without finding a common denominator, leading to incorrect answers.

Imagine a pizza cut into 8 slices. If you eat 3 slices, you've eaten 3/8 of the pizza. The 8 is the total slices (denominator), and the 3 is how many you ate (numerator).`;

	console.log('=== TESTING SUMMARIZATION WITH PRE-TRANSCRIBED TEXT ===\n');

	// Test 1: Gaussian Elimination
	console.log('--- Test 1: Gaussian Elimination Notes ---');
	const section1 = summarizer.createSection('Gaussian Elimination', 'dummy_image_data', 'image/png');
	const summary1 = await summarizer.generateSummaryDirectly(section1, gaussianNotes, llm);
	summarizer.addSummaryDirectly(section1.id, summary1);
	console.log('Summary:', summary1);
	console.log('');

	// Test 2: Fractions
	console.log('--- Test 2: Fractions Notes ---');
	const section2 = summarizer.createSection('Fractions', 'dummy_image_data', 'image/png');
	const summary2 = await summarizer.generateSummaryDirectly(section2, fractionsNotes, llm);
	summarizer.addSummaryDirectly(section2.id, summary2);
	console.log('Summary:', summary2);
	console.log('');

	console.log('=== ALL SUMMARIES ===');
	const summaries = summarizer.getSummaries();
	for (const [sectionId, summaryText] of Object.entries(summaries)) {
		console.log(`\nSection ${sectionId}:`);
		console.log(summaryText);
	}
}

async function main() {
	const args = process.argv.slice(2);
	
	if (args.length === 0) {
		// Run the pre-transcribed text tests by default
		await testSummarizationWithPreTranscribedText();
		return;
	}
	
	if (args.length < 2) {
		console.error('Usage:');
		console.error('  npm run summarize:test --                    # Run pre-transcribed text tests');
		console.error('  npm run summarize:test -- <title> <image>    # Test with actual image');
		process.exit(1);
	}

	// Test with actual image (vision API)
	const config = loadConfig();
	const vision = new TestVisionShim(config.apiKey);
	const llm = new GeminiLLM({ apiKey: config.apiKey });

	const summarizer = new Summarizer();

	const title = args[0];
	const imagePath = args[1];
	const lower = imagePath.toLowerCase();
	const mimeType = lower.endsWith('.png') ? 'image/png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'image/jpeg' : 'image/png';
	const img = toBase64ImagePartFromFile(imagePath, mimeType);
	
	const section = summarizer.createSection(title, img.dataBase64, img.mimeType);
	const summary = await summarizer.addSummary(section.id, vision as any);
	console.log(`Processed image: ${imagePath}`);

	// Test case data - keeping for future reference
	const notesExample1 = `## Lecture 8: Gaussian Elimination

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
This transformed augmented matrix is called $(\\tilde{A}|\\tilde{b})$.`;

	// Test case: Incorrectly translated text from notes2.png
	const notes2Transcription = `Extracted text: 
Processed image: notes2.png

=== SECTION INFO ===
Title: Math Notes
ID: sec_mgejeh25_jn95agv9
MIME Type: image/png

=== SUMMARY ===
*   **Think of the "denominator" as the total number of equal parts something is divided into, and the "numerator" as how many of those parts you have or are considering.**
*   **Key Step:** When comparing or adding fractions, you MUST have the same "size" of parts (same denominator). This often means finding a "common denominator."
*   **Common Pitfall:** Students sometimes try to add or subtract numerators and denominators directly without finding a common denominator, leading to incorrect answers.
*   **Tiny Example:** Imagine a pizza cut into 8 slices. If you eat 3 slices, you've eaten 3/8 of the pizza. The 8 is the total slices (denominator), and the 3 is how many you ate (numerator).

=== ALL SUMMARIES ===

Section sec_mgejeh25_jn95agv9:
*   **Think of the "denominator" as the total number of equal parts something is divided into, and the "numerator" as how many of those parts you have or are considering.**
*   **Key Step:** When comparing or adding fractions, you MUST have the same "size" of parts (same denominator). This often means finding a "common denominator."
*   **Common Pitfall:** Students sometimes try to add or subtract numerators and denominators directly without finding a common denominator, leading to incorrect answers.
*   **Tiny Example:** Imagine a pizza cut into 8 slices. If you eat 3 slices, you've eaten 3/8 of the pizza. The 8 is the total slices (denominator), and the 3 is how many you ate (numerator).`;

	const notes3Transcription = `## Gauss-Jordan Elimination

Gauss-Jordan additional steps: make all pivots = 1, make non-zero entries above pivots

_make all pivots = 1_
$G_3 = \begin{pmatrix} 1 & 0 & 0 \\ 0 & -1/4 & 0 \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} 1 & -1 & 2 & | & 1 \\ 0 & -4 & 8 & | & 0 \\ 0 & 0 & 1 & | & 1 \end{pmatrix} = \begin{pmatrix} 1 & -1 & 2 & | & 1 \\ 0 & 1 & -2 & | & 0 \\ 0 & 0 & 1 & | & 1 \end{pmatrix}$

Labels:
$G_3$ (below the first matrix)
($\tilde{A}$ | $\tilde{B}$) (below the augmented matrix)
$G_3 G_2 G_1 A$ (below the A-part of the result)
$G_3 G_2 G_1 B$ (below the B-part of the result)

_eliminate above pivots_
$\begin{pmatrix} 1 & 1 & 0 \\ 0 & 1 & 2 \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} 1 & -1 & 2 & | & 1 \\ 0 & 1 & -2 & | & 0 \\ 0 & 0 & 1 & | & 1 \end{pmatrix} = \begin{pmatrix} 1 & 0 & 0 & | & 1 \\ 0 & 1 & 0 & | & 2 \\ 0 & 0 & 1 & | & 1 \end{pmatrix}$

Reduced Row Echelon Form? RREF

---

## Matrix Multiplication Rules

- Associative: $A(BC) = (AB)C$
- Distributive: $A(B+C) = AB + AC$
- NOT Commutative: $AB \neq BA$`;

	console.log('\n=== SECTION INFO ===');
	console.log(`Title: ${section.title}`);
	console.log(`ID: ${section.id}`);
	console.log(`MIME Type: ${section.mimeType}`);

	console.log('\n=== SUMMARY ===');
	console.log(summary);

	console.log('\n=== ALL SUMMARIES ===');
	const summaries = summarizer.getSummaries();
	for (const [sectionId, summaryText] of Object.entries(summaries)) {
		console.log(`\nSection ${sectionId}:`);
		console.log(summaryText);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
