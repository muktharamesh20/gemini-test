<concept_spec>

concept Summaries[Item]

purpose
    highlights the most important part of Item

principle
    the user can either manually create a summary or ask an LLM to generate one. 
    If AI is chosen, the LLM receives the Item content and then returns a concise, readable summary. 
    The user can accept or edit this summary.

state
    a set of `Item` with 
        summary String  

    invariants
        every item has at most one summary
        summary is a concise, relevant, and readable highlight of the item's content
        summary contains no meta-language or AI disclaimers
        summary is at most 50% the length of the item's content or under 150 words

actions
    setSummary(summary: String, item: Item): (s: Summary)
        effect if `item` already exists, change the summary associated with `item` to `summary`.  
        If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.
    setSummaryWithAI(text: String, item: Item): (s: Summary)
        requires text is nonempty
        effect creates a summary of `text` with an LLM and associates it with the item
    
</concept_spec>