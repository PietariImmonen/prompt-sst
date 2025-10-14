import { Prompts } from "../prompts";

export interface TranscriptionProcessor {
  intent: "polish" | "compose_email" | "refine_prompt";
  label: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: () => string;
}

export const TRANSCRIPTION_PROCESSORS = [
  {
    intent: "polish",
    label: "Polish Text",
    description: "Clean up the text while keeping the original wording",
    model: "openai/gpt-oss-120b",
    temperature: 0.6,
    maxTokens: 2000,
    systemPrompt: Prompts.polishTranscribedText,
  },
  {
    intent: "compose_email",
    label: "Compose Email",
    description: "Draft a complete email based on the notes",
    model: "openai/gpt-oss-120b",
    temperature: 0.7,
    maxTokens: 1500,
    systemPrompt: Prompts.composeEmailFromTranscription,
  },
  {
    intent: "refine_prompt",
    label: "Build Prompt",
    description: "Transform the notes into an AI-ready prompt",
    model: "openai/gpt-oss-120b",
    temperature: 0.5,
    maxTokens: 1800,
    systemPrompt: Prompts.buildPromptFromTranscription,
  },
] as const satisfies readonly TranscriptionProcessor[];

export type TranscriptionIntent =
  (typeof TRANSCRIPTION_PROCESSORS)[number]["intent"];

export const transcriptionIntentValues = TRANSCRIPTION_PROCESSORS.map(
  (processor) => processor.intent,
) as TranscriptionIntent[];

export const getTranscriptionProcessor = (
  intent: TranscriptionIntent,
): TranscriptionProcessor =>
  TRANSCRIPTION_PROCESSORS.find((processor) => processor.intent === intent) ??
  TRANSCRIPTION_PROCESSORS[0];
