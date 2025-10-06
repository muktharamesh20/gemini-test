## Concept
**Summaries[Item]**
- **Purpose** Highlights the most important part of Item
- **Principle** The user has an item and wants it summarized.  A summary is created for that item, and the user can now view the summary for that item.
- **State:** Set of `Item` with 
    - summary String  
- **Actions:**
    - `setSummary(summary: String, item: Item): (s: Summary)`
        - **effect** if `item` already exists, change the summary associated with `item` to `summary`.  If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.

**Sections[Notes]**  
- **Purpose** Organize a note into seperate topics to make it easier to navigate, and makes the *handwriting notes* experience a little better for the user by reducing the number of times people run out of space because there's notes underneath the part they want to add more notes to.
- **Principle:** while you're creating a note, you can create sections into different topics.  This helps organize your notes and makes it easier to navigate to a single topic within a note.  Practically, this also allows for better *handwriting experience* because if two people work on different sections that are right on top of each other, the person working on the upper notes doesn't need to squeeze in extra notes, or shift all the notes below them down to add more.  Instead, if the upper section needs extra notes they're just expanding the section so it doesn't overlap the lower section.  (check UI Sketch section's annotation for "Editing Notes" page if this doesn't make sense).
- **State:** set of Section with 
    - `parentNote` Note
    - `position` number
    - `text` String
- **Actions:**
    - `createSection(n: Note, p: Number): (s: Section)`
        - **requires** n is an existing Note
        - **effect** creates a new section associated with the parent note n at the `p`th position (1 indexed), pushing everything after it down (increasing their positions by 1).  The text is ''.
    - `modifySection(s: Section, t: String)`
        - **requires** s is an existing Section
        - **effect** changes the text of the section to t.
    - `deleteSection(s: Section)`
        - **requires** s is an existing Section
        - **effect** deletes the section and moves everything after it up by one position (reducing their positions by 1)

## AI Augmentation

**Summaries[Item]**
- **Purpose** Highlights the most important part of Item
- **Principle** The user has an item and wants it summarized.  A summary is created for that item, and the user can now view the summary for that item.
- **State:** Set of `Item` with 
    - summary String  
- **Actions:**
    - `setSummary(summary: String, item: Item): (s: Summary)`
        - **effect** if `item` already exists, change the summary associated with `item` to `summary`.  If `item` does not exist in Summaries, create a new summary for `item` with a summary `summary`.
    - `setSummaryWithAI(item: Item): (s: Summary)`
        - **effect** creates or modifies the summary associated with the item based on the item itself.