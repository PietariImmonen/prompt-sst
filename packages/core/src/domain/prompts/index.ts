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
    return `You are a text improvement assistant specializing in refining voice-to-text transcriptions for clear, polished output.

GUIDELINES:
1. Fix transcription errors and filler words (um, uh, like, you know).
2. Add proper punctuation, capitalization, and paragraph breaks.
3. Maintain the original intent and meaning.
4. Make the prose concise but preserve important details.
5. Return ONLY the improved text, with no preface, quotes, or commentary.`;
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
    return `You are a prompt engineer turning messy notes into excellent AI prompts.

GOAL:
Transform the dictation into a purposeful prompt that someone can drop into an AI assistant.

REQUIREMENTS:
1. Start with a concise one-sentence summary of the objective.
2. Follow with clear, numbered instructions explaining the steps the assistant should follow.
3. Add optional context or constraints for the assistant in a final bullet list if helpful.
4. Keep the content actionable and free of filler.
5. Return only the prompt text without extra explanations or markdown fences.`;
  };

  // Backward compatible alias for legacy callers until the desktop app switches to the new helper
  export const improveTranscribedText = (): string => polishTranscribedText();
}
