export const PROMPT_INSERTION_PALETTE_OPEN_EVENT = 'prompt-insertion-palette:open'

export function getPromptPaletteShortcutDisplay(isCapture?: boolean) {
  const isMac =
    typeof navigator !== 'undefined'
      ? /Mac|iPhone|iPod|iPad/i.test(navigator.platform ?? '')
      : false
  const tokens = isMac ? ['⌘', '⇧', isCapture ? 'P' : 'O'] : ['Ctrl', '⇧', isCapture ? 'P' : 'O']
  return tokens.join(' ')
}
