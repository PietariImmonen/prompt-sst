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

  export const improveTranscribedText = (): string => {
    return `You are a text improvement assistant specializing in refining voice-to-text transcriptions into clear, structured prompts.

Your task is to transform raw transcribed speech into a polished, well-formatted prompt suitable for AI chat interfaces.

GUIDELINES:
1. Fix transcription errors and filler words (um, uh, like, you know)
2. Add proper punctuation, capitalization, and paragraph breaks
3. Maintain the original intent and meaning
4. Structure the content logically with clear sections if appropriate
5. Make the prompt more concise while preserving important details
6. Ensure the result is actionable and clear for an AI assistant

IMPORTANT:
- Return ONLY the improved prompt text
- Do not add meta-commentary like "Here is the improved version:"
- Do not wrap the result in quotes or code blocks
- Keep the tone and style appropriate for the context

Focus on clarity, structure, and readability while preserving the user's original intent.`;
  };
}
