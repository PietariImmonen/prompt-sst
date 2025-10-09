# Automatic Prompt Categorization Implementation Summary

## Overview

Successfully implemented an LLM-powered automatic tag assignment system for prompts using OpenRouter API with structured output. The categorization runs asynchronously via the event bus after prompt creation.

## Implementation Details

### 1. Event Definition and Publishing

**File:** `packages/core/src/domain/prompt/index.ts`

- Added `Events.PromptCreated` event definition with schema validation
- Event includes `promptID`, `workspaceID`, and optional `skipCategorization` flag
- Event is published after successful prompt creation in `Prompt.create()`
- Only publishes event if `skipCategorization` is false AND no manual tags were provided
- Added `skipCategorization` field to `PromptCreateSchema` for opt-out capability

### 2. Categorization Prompt Template

**File:** `packages/core/src/domain/prompts/index.ts`

- Implemented `Prompts.categorizePrompt()` function that generates system prompts
- Input schema includes: `promptTitle`, `promptContent`, and `availableTags` array
- Prompt instructs LLM to return 3-5 most relevant tag IDs from available tags
- Includes guidance to return empty array if no tags are truly relevant
- Generates formatted list of available tags with IDs, names, and descriptions

### 3. LLM Categorization Logic

**File:** `packages/core/src/domain/llm/index.ts`

- Implemented `LLM.analyzePrompt()` function with comprehensive error handling
- Fetches prompt details via `Prompt.fromID()`
- Fetches workspace tags via `Tag.listByWorkspace()`
- Calls OpenRouter API using OpenAI client with structured output
- Uses `openai/gpt-4o-mini` model (fast and cost-effective)
- Validates LLM response using Zod schema
- Filters returned tag IDs to ensure they exist in the workspace
- Applies validated tags to prompt via `Prompt.setTags()`
- Silent failure with comprehensive logging to prevent retry loops
- Gracefully handles edge cases (no prompt found, no tags available, no valid tags returned)

### 4. Event Bus Subscriber

**File:** `packages/functions/src/event/event.ts`

- Added `Prompt.Events.PromptCreated` to subscriber array
- Implemented `"prompt.created"` case handler
- Calls `LLM.analyzePrompt()` within `ActorContext.with()` for proper actor context
- Event bus already configured with 5-minute timeout and automatic retry logic

## Technical Decisions

- **Async Processing:** Prompts save immediately; categorization happens asynchronously via event bus
- **Transaction Safety:** Event is published using `createTransactionEffect()` to ensure it fires **after** the database transaction commits successfully
- **Retry Logic:** SST event bus handles retries automatically (5-minute timeout configured in `infra/bus.ts`)
- **Error Handling:** Silent failure with detailed logging if categorization fails
- **Tag Limit:** LLM returns 3-5 most relevant tags (validated with max 5)
- **Model:** Using `openai/gpt-4o-mini` for fast and cost-effective categorization
- **Skip Flag:** `skipCategorization` parameter allows bypassing auto-categorization
- **Smart Triggering:** Only triggers categorization if no manual tags were provided during creation
- **Client Initialization:** OpenRouter client created once as singleton at module level (per OpenRouter documentation)

## Configuration

### OpenRouter API Key

The system uses the `OpenRouterApiKey` secret defined in `infra/secret.ts`. The LLM module supports two ways to access it:

1. Environment variable: `OPENROUTER_API_KEY`
2. SST Resource: `Resource.OpenRouterApiKey.value`

### Event Bus Configuration

The event bus subscriber in `infra/bus.ts` is configured with:

- 5-minute timeout for categorization tasks
- Automatic retry logic
- Access to database, realtime, file upload bucket, and all secrets
- IAM permissions for IoT and STS operations

## Usage

### Creating a Prompt with Auto-Categorization

```typescript
// Auto-categorization will trigger
await Prompt.create({
  title: "Example prompt",
  content: "This is a test prompt",
  source: "desktop",
});
```

### Creating a Prompt without Auto-Categorization

```typescript
// Skip auto-categorization
await Prompt.create({
  title: "Example prompt",
  content: "This is a test prompt",
  source: "desktop",
  skipCategorization: true,
});
```

### Creating a Prompt with Manual Tags

```typescript
// Manual tags provided, auto-categorization skipped
await Prompt.create({
  title: "Example prompt",
  content: "This is a test prompt",
  source: "desktop",
  tagIDs: ["tag-id-1", "tag-id-2"],
});
```

## Testing Considerations

1. **Unit Tests:** Test `Prompts.categorizePrompt()` with various inputs
2. **Integration Tests:** Test LLM categorization with mock OpenRouter responses
3. **End-to-End Tests:** Create prompts and verify tags are applied asynchronously
4. **Edge Cases:** Test with no tags available, invalid LLM responses, and network failures

## Monitoring

The implementation includes comprehensive logging at each step:

- `[LLM]` prefix for categorization logic logs
- `[Event]` prefix for event processing logs
- Logs include prompt IDs, tag counts, and error details
- Silent failures are logged but don't throw to prevent retry loops

## Future Enhancements

1. Add user preferences for auto-categorization (per-workspace settings)
2. Implement confidence scores for tag assignments
3. Add support for creating new tags based on LLM suggestions
4. Implement batch categorization for existing prompts
5. Add metrics and monitoring for categorization success rates
6. Support multiple LLM providers (Anthropic, etc.)
7. Implement A/B testing for different categorization prompts
