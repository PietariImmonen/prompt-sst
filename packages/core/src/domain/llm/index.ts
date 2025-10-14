import OpenAI from "openai";
import { Resource } from "sst";
import { z } from "zod";

import { ActorContext } from "../../actor";
import { zod } from "../../util/zod";
import { Prompt } from "../prompt";
import { Prompts } from "../prompts";
import { Tag } from "../tag";
import {
  getTranscriptionProcessor,
  TRANSCRIPTION_PROCESSORS,
  transcriptionIntentValues,
} from "./transcription";
import type {
  TranscriptionIntent,
  TranscriptionProcessor,
} from "./transcription";

export const TranscriptionIntentSchema = z.enum(
  transcriptionIntentValues as [TranscriptionIntent, ...TranscriptionIntent[]],
);

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

const ClassifyTranscriptionInputSchema = z.object({
  text: z.string().min(1).max(10000),
});

const ClassifyTranscriptionResponseSchema = z
  .object({
    intent: TranscriptionIntentSchema,
    confidence: z.number().min(0).max(1).optional(),
    rationale: z.string().optional(),
  })
  .catchall(z.unknown());

const ImproveTextInputSchema = z.object({
  text: z.string().min(1).max(10000),
  intent: TranscriptionIntentSchema.optional(),
});

const extractJsonObject = (content: string): unknown => {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw error;
    }
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch (inner) {
      const normalized = candidate
        .replace(/""/g, '"')
        .replace(/'(\w+)':/g, '"$1":')
        .replace(/: '(.*?)'/g, ': "$1"');
      return JSON.parse(normalized);
    }
  }
};

const heuristicClassification = (
  text: string,
): { intent: TranscriptionIntent; confidence: number; rationale: string } => {
  const lower = text.toLowerCase();

  if (/(email|inbox|mail|send|dear|subject)/.test(lower)) {
    return {
      intent: "compose_email",
      confidence: 0.55,
      rationale: "Detected email-related keywords",
    };
  }

  if (/(prompt|workflow|instruct|assistant|ai\s+prompt)/.test(lower)) {
    return {
      intent: "refine_prompt",
      confidence: 0.55,
      rationale: "Detected prompt engineering cues",
    };
  }

  return {
    intent: "polish",
    confidence: 0.4,
    rationale: "Defaulted to polish with no strong intent signals",
  };
};

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
          model: "openai/gpt-oss-20b:free",
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

        // Apply tags to prompt with retry logic for serialization errors
        let retries = 0;
        const maxRetries = 3;
        while (retries < maxRetries) {
          try {
            await Prompt.setTags({
              id: input.promptID,
              tagIDs: validTagIDs,
            });
            break;
          } catch (error: unknown) {
            // PostgreSQL serialization failure error code
            const pgError = error as { code?: string };
            if (pgError?.code === "40001" && retries < maxRetries - 1) {
              retries++;
              console.log(
                `[LLM] Serialization error on attempt ${retries}, retrying...`,
              );
              // Exponential backoff: 100ms, 200ms, 400ms
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * Math.pow(2, retries - 1)),
              );
              continue;
            }
            throw error;
          }
        }

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

  export const classifyTranscriptionIntent = zod(
    ClassifyTranscriptionInputSchema,
    async (input) => {
      try {
        console.log(
          `[LLM] Classifying transcription intent for ${input.text.length} characters`,
        );

        const completion = await openRouterClient.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: Prompts.classifyTranscriptionIntent(),
            },
            {
              role: "user",
              content: input.text,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: 150,
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
          throw new Error("Empty classification response from OpenRouter");
        }

        try {
          const parsed = extractJsonObject(responseContent);
          const validated = ClassifyTranscriptionResponseSchema.safeParse(parsed);
          if (!validated.success) {
            throw validated.error;
          }

          return validated.data;
        } catch (parseError) {
          console.warn(
            `[LLM] Unable to parse classification response, using heuristic fallback`,
            parseError,
            `\nRaw response: ${responseContent}`,
          );
          return heuristicClassification(input.text);
        }
      } catch (error) {
        console.error(
          `[LLM] Classification error, defaulting to heuristic intent`,
          error,
        );
        return heuristicClassification(input.text);
      }
    },
  );

  /**
   * Improve transcribed text by routing it through the best-performing processor.
   * Returns the full processed text alongside metadata about the selected intent.
   */
  export async function improveText(
    input: z.infer<typeof ImproveTextInputSchema>,
  ): Promise<{
    intent: TranscriptionIntent;
    processor: TranscriptionProcessor;
    text: string;
    confidence?: number;
    rationale?: string;
  }> {
    const validated = ImproveTextInputSchema.parse(input);

    const classification = validated.intent
      ? { intent: validated.intent as TranscriptionIntent }
      : await classifyTranscriptionIntent({ text: validated.text });

    const resolvedIntent =
      TRANSCRIPTION_PROCESSORS.find(
        (processor) => processor.intent === classification.intent,
      )?.intent ?? ("polish" as TranscriptionIntent);

    const processor = getTranscriptionProcessor(resolvedIntent);

    const confidenceText =
      typeof (classification as { confidence?: number }).confidence === "number"
        ? ` (confidence=${(classification as { confidence: number }).confidence.toFixed(2)})`
        : "";

    console.log(
      `[LLM] Routing transcription to intent="${resolvedIntent}" using ${processor.model}${confidenceText}`,
    );

    const completion = await openRouterClient.chat.completions.create({
      model: processor.model,
      messages: [
        {
          role: "system",
          content: processor.systemPrompt(),
        },
        {
          role: "user",
          content: validated.text,
        },
      ],
      temperature: processor.temperature,
      max_tokens: processor.maxTokens,
    });

    const messageContent = completion.choices[0]?.message?.content?.trim();
    if (!messageContent) {
      throw new Error(
        `Empty response from processor for intent ${resolvedIntent}`,
      );
    }

    console.log(`[LLM] Completed ${resolvedIntent} processing`);

    return {
      intent: resolvedIntent,
      processor,
      text: messageContent,
      confidence: (classification as { confidence?: number }).confidence,
      rationale: (classification as { rationale?: string }).rationale,
    };
  }
}
