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
- **Principle** The user can either manually create a summary or ask an LLM to generate one. The LLM receives the Item content and then returns a concise, readable summary. The user can accept, edit, or regenerate this AI summary.
- **State:** Set of `Item` with 
    - summary String  
- **Actions:**
    - `setSummary(summary: String, item: Item): (s: Summary)`
        - **effect** if `item` already exists, change the summary associated with `item` to `summary`.  If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.
    - `setSummaryWithAI(item: Item): (s: Summary)`
        - **effect** creates or modifies the summary associated with the item based on the item itself.
