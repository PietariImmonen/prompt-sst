import OpenAI from "openai";
import { Resource } from "sst";
import { z } from "zod";

import { ActorContext } from "../../actor";
import { zod } from "../../util/zod";
import { Prompt } from "../prompt";
import { Prompts } from "../prompts";
import { Tag } from "../tag";

const AnalyzePromptInputSchema = z.object({
  promptID: z.string().cuid2(),
  workspaceID: z.string().cuid2(),
  skipCategorization: z.boolean().optional(),
});

const LLMResponseSchema = z.object({
  tagIDs: z.array(z.string()).max(5),
});

// Initialize OpenRouter client once as per https://openrouter.ai/docs/quickstart
const openRouterClient = new OpenAI({
  apiKey: Resource.OpenRouterApiKey.value,
  baseURL: "https://openrouter.ai/api/v1",
});

export namespace LLM {
  export const analyzePrompt = zod(AnalyzePromptInputSchema, async (input) => {
    try {
      // Skip if explicitly requested
      if (input.skipCategorization) {
        console.log(
          `[LLM] Skipping categorization for prompt ${input.promptID}`,
        );
        return;
      }

      // Use the actor from the event metadata
      const actor = ActorContext.use();

      await ActorContext.with(actor, async () => {
        // Fetch prompt details
        const promptData = await Prompt.fromID(input.promptID);
        if (!promptData) {
          console.error(
            `[LLM] Prompt ${input.promptID} not found, skipping categorization`,
          );
          return;
        }

        // Fetch workspace tags
        const workspaceTags = await Tag.listByWorkspace();
        if (!workspaceTags || workspaceTags.length === 0) {
          console.log(
            `[LLM] No tags available in workspace ${input.workspaceID}, skipping categorization`,
          );
          return;
        }

        // Prepare tags for LLM
        const availableTags = workspaceTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          description: tag.description,
        }));

        // Generate categorization prompt
        const systemPrompt = Prompts.categorizePrompt({
          promptTitle: promptData.title,
          promptContent: promptData.content,
          availableTags,
        });

        console.log(
          `[LLM] Categorizing prompt ${input.promptID} with ${availableTags.length} available tags`,
        );

        // Call LLM with structured output using singleton client
        const completion = await openRouterClient.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 500,
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
          console.error(
            `[LLM] No response from LLM for prompt ${input.promptID}`,
          );
          return;
        }

        // Parse and validate response
        const parsedResponse = JSON.parse(responseContent);
        const validatedResponse = LLMResponseSchema.parse(parsedResponse);

        // Filter to only valid tag IDs
        const validTagIDs = validatedResponse.tagIDs.filter((tagID) =>
          workspaceTags.some((tag) => tag.id === tagID),
        );

        if (validTagIDs.length === 0) {
          console.log(
            `[LLM] No valid tags returned for prompt ${input.promptID}`,
          );
          return;
        }

        console.log(
          `[LLM] Applying ${validTagIDs.length} tags to prompt ${input.promptID}`,
        );

        // Apply tags to prompt
        await Prompt.setTags({
          id: input.promptID,
          tagIDs: validTagIDs,
        });

        console.log(
          `[LLM] Successfully categorized prompt ${input.promptID} with tags: ${validTagIDs.join(", ")}`,
        );
      });
    } catch (error) {
      // Silent failure with logging - don't throw to prevent event retry loops
      console.error(
        `[LLM] Error categorizing prompt ${input.promptID}:`,
        error,
      );
    }
  });
}
