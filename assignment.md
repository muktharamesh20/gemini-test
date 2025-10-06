## Concept
**Summaries[Item]**
- **Purpose** Highlights the most important part of Item
- **Principle** The user has an item and wants it summarized.  the user creates a summary and associates it with the item, and the user can now view the summary for that item.
- **State:** Set of `Item` with 
    - summary String  
- **Actions:**
    - `setSummary(summary: String, item: Item): (s: Summary)`
        - **effect** if `item` already exists, change the summary associated with `item` to `summary`.  If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.

## AI Augmentation
**Summaries[Item]**
- **Purpose** Highlights the most important part of Item
- **Principle** The user can either manually create a summary or ask an LLM to generate one. The LLM receives the Item content and then returns a concise, readable summary. The user can accept or edit this summary.
- **State:** Set of `Item` with 
    - summary String  
- **Actions:**
    - `setSummary(summary: String, item: Item): (s: Summary)`
        - **effect** if `item` already exists, change the summary associated with `item` to `summary`.  If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.
    - `setSummaryWithAI(text: String, item: Item): (s: Summary)`
        - **effect** creates a summary of `text` and associates it with the item


## User Interaction
Every time a user finishes writing a note, there would be an automatic sync to transcribe and summarize the note and its sections. The user doesn't see this summary until they return to the note. When they do, they can click on the summary button of a note or section to get a brief overview without having to read through all the notes. The user can also choose to modify the summary themselves via a button on the summary page.


## Validators
Three potential issues include summary length, meta-language, and content relevance.  I've encountered all three of these while prompt engineering.  First, the summary length can be nearly the same length as the notes, which defeats the purpose of the summary.  In order to make sure that it's concise, I added a validator to make sure that it's either less than 80 words, or less than 50% the length of the transcription.  Another potential problem is that the AI uses meta language like "I'm an AI", or "here's a summary" or "I couldn't generate a summary" when we just want it to only give us the summary.  Here, I put a list of generic phrases and meta-language to make sure doesn't appear.  Finally, in one of my tests, the transcription and summary were completely unrelated so I have a content relevance validator too to make sure that the transcription and summary do relate.  If any of the validators are triggered, it will retry calling gemini one more time, and otherwise it will throw an error.  On the user side, perhaps it will simply say it couldn't generate a summary.

### Richer Test Cases + Prompts
1. Original Prompt: Summarize the following notes to help a student understand the concept better. You will simply add helpful context, not repeat the notes.  On the app that this will appear on, you will be on a side bar next to the notes Include key steps and common pitfalls, and a tiny example if relevant.  Keep it concise (<=5 bullet points). Input:'

For this one, the summaries kept starting with the words "Here's a summary of".  I didn't want any language that wasn't directly related to the summary.  On one of the test cases, it also said "I couldn't generate a summary", and I didn't want any meta-language like that.  In order to limit this, here's the new prompt I created:

2. "Summarize the following notes to help a student understand the concept better. You are not explaining that you are summarizing — just provide the actual summary itself. Avoid any introductory or meta-language (e.g., ‘Here’s a summary,’ or ‘I couldn’t generate a summary’). Your summary should be written as 3–5 concise bullet points, each capturing a key step, insight, or common mistake, with a small illustrative example if helpful. Keep the language clear, direct, and contextually tied to the input."


For one test, I tried putting a Gauss Jordan transcript and got back notes about fractions.  It turned out that I had put the prompt in wrong, but the LLM should have caught that there was no relevance to the transcript.  In order to make sure that the summary stays relevant, I changed the prompt to make sure that it only answered it knew the answer and to check that it was relevant.


3. "Summarize the following notes to help a student understand the concept better. Before writing the summary, double-check that your summary accurately reflects the content of the notes. If you detect that your summary might not match the topic or meaning of the notes, do not output a summary — instead, respond with: ‘The summary could not be generated because the content was unclear or unrelated.’ Provide only the summary itself, with no meta-language. Write 3–5 concise bullet points that highlight key ideas, steps, or common mistakes, with short examples if useful. Keep it accurate, relevant, and tied directly to the notes provided."

For this one, the first test case with the Gaussian Elimination Notes created a very long summary compared to the transcription.  I added a validator, and it said the summary was 60% of the original text length.  In order to accomodate this, I adjusted the prompt to specifically try to be concise, and be more like a table of contents than anything.

4. `Summarize the following notes to help a student understand the concept better. If you detect that your summary might not match the topic or meaning of the notes, do not output a summary — instead, respond with: "The summary could not be generated because the content was unclear or unrelated." Provide only the summary itself, with no meta-language. Write bullet points that highlight key ideas, steps, or common mistakes, but make it like a table of contents and keep it very concise. Again, to reiterate, keep it as concise as possible, making it at most 40% of the total transcript length. Try writing 3–5 bullet points total. Make sure that you only add high level concepts, not detailed steps. Keep it accurate, relevant, and tied directly to the notes provided.`


## 8. Usage

```bash
# Test summarization with pre-transcribed text (fast, no API calls)
npm run summarize:test

# Test vision accuracy with actual images (uses API)
npm run vision:test -- notes1.png notes2.png
```
