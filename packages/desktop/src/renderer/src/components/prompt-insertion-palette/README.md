# Prompt Insertion Palette

A refactored and improved prompt insertion system for the desktop application.

## Architecture

The prompt insertion system has been completely refactored to solve the infinite loading loop issues and improve maintainability through better separation of concerns.

### File Structure

```
prompt-insertion-palette/
├── README.md                           # This documentation
├── index.ts                           # Public API exports
├── types.ts                           # TypeScript interfaces
├── prompt-overlay.tsx                 # Main overlay component
├── hooks/
│   ├── use-overlay-prompts.ts        # Prompt loading and state management
│   └── use-prompt-search.ts          # Search and filtering logic
├── services/
│   └── prompt-ipc-service.ts         # IPC communication service
└── legacy/
    ├── prompt-insertion-palette.tsx  # Original component (kept for reference)
    └── shortcut.ts                   # Keyboard shortcut handling
```

## Key Improvements

### 1. Fixed Infinite Loading Loop
- **Problem**: Circular dependency in `useCallback` causing infinite re-renders
- **Solution**: Proper dependency management with refs for state tracking

### 2. Separation of Concerns
- **Prompt Loading**: `useOverlayPrompts` hook manages loading state and caching
- **Search Logic**: `usePromptSearch` hook handles filtering and ranking
- **IPC Communication**: Dedicated service class with retry logic
- **UI Component**: Clean presentation layer without business logic

### 3. Improved State Management
- Load prompts only once when overlay opens
- Proper error handling and loading states
- Cached data to avoid unnecessary re-fetches
- Clean reset when overlay closes

### 4. Better TypeScript Support
- Comprehensive type definitions
- Interface-based architecture
- Type-safe IPC communication

## Usage

### Basic Usage
```tsx
import { PromptOverlay } from '@/components/prompt-insertion-palette'

function App() {
  return <PromptOverlay onSelectPrompt={handleSelect} onClose={handleClose} />
}
```

### Hook Usage
```tsx
import { useOverlayPrompts, usePromptSearch } from '@/components/prompt-insertion-palette'

function CustomOverlay() {
  const { prompts, state, setVisible } = useOverlayPrompts()
  const filteredPrompts = usePromptSearch(prompts, searchQuery)

  // Your custom UI logic
}
```

## Data Flow

1. **Overlay Opens**: `useOverlayPrompts` sets visible state and triggers loading
2. **Load Once**: `promptIPCService.getPrompts()` fetches data via IPC with retry logic
3. **Cache Data**: Prompts are cached in component state until overlay closes
4. **Search/Filter**: `usePromptSearch` provides real-time filtering without re-fetching
5. **Selection**: User selects prompt, triggers IPC message to main process
6. **Cleanup**: Overlay closes, state resets, service resets retry counters

## Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **IPC Failures**: Graceful degradation with error messages
- **Empty Results**: Clear user feedback for different scenarios
- **Loading States**: Visual indicators for all async operations

## Performance Optimizations

- **Single Load**: Prompts loaded once per overlay session
- **Debounced Search**: Search queries debounced to avoid excessive filtering
- **Memoized Results**: Search results memoized to prevent unnecessary recalculations
- **Efficient Rendering**: Virtualized list for large prompt collections (future enhancement)

## Migration Notes

### From Old System
- Replace `SimplePromptOverlay` with `PromptOverlay`
- Remove manual retry logic (now handled by service)
- Update import paths to use new components
- Remove periodic data fetching (no longer needed)

### Breaking Changes
- `SimplePromptOverlay` component removed
- IPC communication pattern simplified
- Loading state management changed
- Prompt data structure remains compatible

## Future Enhancements

1. **Virtual Scrolling**: For handling large prompt collections
2. **Keyboard Shortcuts**: Enhanced navigation and selection
3. **Favorites Management**: Quick access to favorite prompts
4. **Categories**: Better organization and filtering
5. **Sync Indicators**: Visual feedback for data synchronization