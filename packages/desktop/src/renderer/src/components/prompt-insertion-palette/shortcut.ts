export const PROMPT_INSERTION_PALETTE_OPEN_EVENT =
  "prompt-insertion-palette:open";

export function getPromptPaletteShortcutDisplay() {
  const isMac =
    typeof navigator !== "undefined"
      ? /Mac|iPhone|iPod|iPad/i.test(navigator.platform ?? "")
      : false;
  const tokens = isMac ? ["⌘", "⇧", "O"] : ["Ctrl", "⇧", "O"];
  return tokens.join(" ");
}
