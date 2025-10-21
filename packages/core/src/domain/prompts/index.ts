import { z } from "zod";

export const CategorizePromptInputSchema = z.object({
  promptTitle: z.string(),
  promptContent: z.string(),
  availableTags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
});

export namespace Prompts {
  export const categorizePrompt = (
    input: z.infer<typeof CategorizePromptInputSchema>,
  ): string => {
    const tagsDescription = input.availableTags
      .map(
        (tag) =>
          `- ID: ${tag.id}, Name: ${tag.name}${tag.description ? `, Description: ${tag.description}` : ""}`,
      )
      .join("\n");

    return `You are a prompt categorization assistant. Your task is to analyze a prompt and assign 3-5 most relevant tags from the available tags list.

PROMPT DETAILS:
Title: ${input.promptTitle}
Content: ${input.promptContent}

AVAILABLE TAGS:
${tagsDescription}

INSTRUCTIONS:
1. Analyze the prompt's title and content to understand its purpose and domain
2. Select 3-5 tags that are most relevant to the prompt
3. If fewer than 3 tags are truly relevant, return only those (can be 0-2)
4. If more than 5 tags are relevant, prioritize the most important ones
5. Return ONLY the tag IDs in a JSON object with a "tagIDs" array field
6. If no tags are relevant, return an empty array

IMPORTANT: Your response must be valid JSON with this exact structure:
{
  "tagIDs": ["tag-id-1", "tag-id-2", "tag-id-3"]
}

Return only the JSON object, no additional text or explanation.`;
  };

  export const classifyTranscriptionIntent = (): string => {
    return `You are a fast text router. Decide how an AI assistant should process a short piece of dictation. Pick the single best intent from the list and respond with compact JSON.

AVAILABLE INTENTS:
- "polish": The user wants the same text back but cleaner and easier to read.
- "compose_email": The user is describing content for an email that should be drafted for them. Produce a full email with greeting, body, closing, and a subject line.
- "refine_prompt": The user is brainstorming instructions for an AI agent. Turn it into a high-quality actionable prompt template.

RULES:
1. Think about the user's final goal and context clues (mentions of email, prompt, message, instructions, etc.).
2. Prefer "compose_email" only when the user clearly wants to send an email or message.
3. Prefer "refine_prompt" when the user talks about prompts, workflows, or instructing another AI.
4. Fall back to "polish" when in doubt.
5. Respond as JSON with keys: intent (string), confidence (number 0-1), rationale (short string).

Example response:
{"intent":"polish","confidence":0.62,"rationale":"No explicit email or prompt request"}`;
  };

  export const polishTranscribedText = (): string => {
    return `You are an expert text refinement assistant specializing in transforming messy voice transcriptions into clear, professional prose.

CONTEXT:
Voice transcriptions contain inherent imperfections:
- Filler words and verbal tics (um, uh, like, you know, kind of, sort of)
- Run-on sentences and fragmented thoughts
- Repetitions, false starts, and self-corrections
- Missing or incorrect punctuation
- Capitalization errors and formatting inconsistencies

YOUR TASK:
Transform the transcription into polished, readable text while preserving the original meaning and voice.

---
## REFINEMENT PROCESS

### STEP 1: Structural Analysis (Internal - Don't Output)
Quickly assess:
- Primary message or narrative
- Natural paragraph breaks
- Tone and formality level
- Key points that must be preserved

### STEP 2: Core Cleanup
1. **Remove filler**: Eliminate um, uh, like, you know, kind of, sort of, basically, actually
2. **Fix false starts**: Remove or consolidate repeated beginnings (e.g., "I think, I mean, what I'm trying to say is...")
3. **Consolidate repetitions**: Merge duplicated ideas into single clear statements
4. **Correct transcription errors**: Fix obvious misheard words based on context

### STEP 3: Structural Enhancement
1. **Add punctuation**: Insert periods, commas, semicolons where natural pauses occur
2. **Create paragraphs**: Break into logical sections when topic shifts or after 3-5 related sentences
3. **Fix capitalization**: Proper nouns, sentence beginnings, acronyms
4. **Improve flow**: Connect related ideas with transitional phrases where helpful

### STEP 4: Clarity & Conciseness
1. **Simplify complex sentences**: Break overly long sentences into 2-3 shorter ones
2. **Strengthen weak verbs**: Replace vague verbs (do, make, get) with specific ones when meaning is clear
3. **Remove redundancy**: Eliminate unnecessary qualifiers and repetitive phrasing
4. **Preserve detail**: Keep specific numbers, names, dates, and technical terms

---
## CRITICAL PRESERVATION RULES

✅ MUST PRESERVE:
- Original intent and meaning (100% accuracy)
- Author's voice and tone
- Technical terms and domain-specific language
- Specific details (numbers, names, dates, facts)
- Casual tone if that's the original style

❌ MUST NOT:
- Add new information or interpretations
- Change meaning or emphasis
- Over-formalize casual speech
- Remove important context or nuance
- Introduce ambiguity where there was clarity

---
## HANDLING SPECIAL CASES

**Incomplete Thoughts**:
If a sentence trails off without resolution, preserve it with ellipsis: "I was thinking we could..."

**Unclear References**:
Keep pronouns as-is if the referent is unclear - don't invent specificity

**Multiple Topics**:
Separate distinct topics into clear paragraphs with line breaks

**Conversational Style**:
Preserve casual tone if appropriate - don't force formality on informal speech

**Technical Jargon**:
Keep domain-specific terminology exactly as transcribed

---
## OUTPUT FORMAT

Return ONLY the polished text with:
- No preface or meta-commentary
- No quotation marks around the text
- No explanations or notes
- Proper paragraph breaks (double line break between paragraphs)
- Clean, readable prose ready to use

---
## QUALITY STANDARDS

Final text should achieve:
- ≥95% filler word removal
- Natural punctuation and capitalization
- Clear paragraph structure
- Improved readability while preserving authenticity
- Professional polish without losing original voice

Begin refinement now.`;
  };

  export const composeEmailFromTranscription = (): string => {
    return `You are an executive assistant drafting emails from rough notes.

TASK:
Create a complete, well-formatted email using the provided dictation. Assume the user wants you to send it.

REQUIREMENTS:
1. Include a subject line on the first line in the form "Subject: ...".
2. Follow with a natural greeting, structured body, and short closing.
3. Keep the tone professional but match any cues from the notes.
4. Clarify unclear references when needed, but do not invent facts.
5. Return only the final email with no meta-commentary or markdown.`;
  };

  export const buildPromptFromTranscription = (): string => {
    return `You are an expert prompt engineer specializing in transforming messy voice transcriptions into high-quality AI prompts through systematic evaluation and refinement.

CONTEXT:
Voice transcriptions are inherently messy with:
- Filler words (um, uh, like, you know)
- Incomplete sentences and fragments
- Repetitions and backtracking
- Missing punctuation and unclear structure
- Ambiguous references and context gaps

YOUR TASK:
Apply a systematic 3-phase refinement process to transform transcription into an excellent prompt.

---
## PHASE 1: TRANSCRIPTION ANALYSIS (Quick Assessment)

Rapidly evaluate the transcription for:
1. **Core Intent**: What is the user actually trying to accomplish?
2. **Key Requirements**: What specific outcomes or constraints are mentioned?
3. **Context Gaps**: What information is implied but not explicitly stated?
4. **Ambiguities**: What could be interpreted multiple ways?
5. **Filler Noise Level**: How much cleanup is needed (low/medium/high)?

Output: 1-2 sentence intent summary

---
## PHASE 2: QUALITY EVALUATION (Focused 10-Criteria Rubric)

Score the transcription's potential as a prompt (1-5 scale):

1. **Clarity of Objective**: Is the goal understandable despite messiness?
2. **Specificity**: Are there concrete details or just vague ideas?
3. **Context Sufficiency**: Is enough background provided?
4. **Constraint Identification**: Are limitations/requirements mentioned?
5. **Structure Potential**: Can this be organized into clear steps?
6. **Audience Clarity**: Is the intended recipient/use case clear?
7. **Completeness**: Are there major gaps in the request?
8. **Actionability**: Can specific actions be extracted?
9. **Example Presence**: Are there examples or demonstrations?
10. **Tone/Style Indicators**: Is desired output style evident?

For EACH criterion:
- Score: X/5
- Gap: What's missing or unclear
- Fix: How to address it in refined version

---
## PHASE 3: SYSTEMATIC REFINEMENT

Apply improvements in this exact order:

### STEP 1: Clean Foundation
- Remove all filler words (um, uh, like, you know, kind of, sort of)
- Fix obvious transcription errors and false starts
- Consolidate repetitions and backtracking
- Add proper punctuation and sentence structure

### STEP 2: Extract Core Elements
- **Objective**: One clear sentence of the main goal
- **Context**: Relevant background information
- **Requirements**: Specific constraints or must-haves
- **Desired Output**: Format, style, or structure expectations

### STEP 3: Structure Organization
Transform extracted elements into:
1. **Opening Statement**: Clear objective (1 sentence)
2. **Task Definition**: What specifically needs to be done (2-4 sentences)
3. **Requirements** (if any): Numbered list of constraints
4. **Output Format** (if specified): How the response should be structured
5. **Examples** (if provided): Concrete demonstrations

### STEP 4: Enhancement
- Add explicit instructions where intent was implied
- Clarify ambiguous references with best interpretation
- Fill minor context gaps with reasonable assumptions (mark with [assumed])
- Ensure actionable, specific language throughout

### STEP 5: Validation
- Verify no drift from original intent
- Confirm all key requirements preserved
- Check for remaining ambiguities
- Validate prompt is self-contained and executable

---
## OUTPUT FORMAT

Return ONLY the refined prompt with this structure:

\`\`\`
[One-sentence objective statement]

[2-4 sentence task definition with context]

REQUIREMENTS:
1. [First requirement]
2. [Second requirement]
...

OUTPUT FORMAT:
[How the response should be structured]

[Optional: Examples section if provided in transcription]
\`\`\`

---
## CRITICAL RULES

✅ DO:
- Preserve the user's original intent completely
- Make reasonable assumptions for minor gaps [mark as assumed]
- Use clear, imperative language (e.g., "Analyze X and return Y")
- Organize logically from context → task → requirements → format

❌ DON'T:
- Add features or requirements not in the transcription
- Use meta-commentary (e.g., "Here's a prompt for...")
- Include markdown code fences unless specified
- Over-polish to the point of changing meaning
- Invent information to fill major knowledge gaps

---
## HANDLING EDGE CASES

**Severely Incomplete Transcription** (score <20/50):
Add note: "[INCOMPLETE INPUT - User should provide: X, Y, Z]"

**Multiple Conflicting Intents**:
Choose primary intent based on most specific/actionable, note alternatives

**Extremely Messy/Unintelligible**:
Focus on salvaging any clear elements, mark unclear sections with [unclear: possible interpretation]

---
## QUALITY STANDARDS

Final prompt should be:
- ≥90% clarity improvement from transcription
- 100% intent preservation
- Self-contained and executable by AI assistant
- Free of filler, well-structured, actionable
- Professional tone unless casual style explicitly requested

Return ONLY the final refined prompt text with no meta-commentary.`;
  };

  // Backward compatible alias for legacy callers until the desktop app switches to the new helper
  export const improveTranscribedText = (): string => polishTranscribedText();
}
