import * as React from 'react'
import { Editor } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'

interface EditorToolbarProps {
  editor: Editor | null
  disabled?: boolean
}

export const EditorToolbar = ({ editor, disabled }: EditorToolbarProps) => {
  const [isCopied, setIsCopied] = React.useState<boolean>(false)

  if (!editor) return <></>

  const handleCopy = () => {
    const content = editor.getHTML()
    const fragment = editor.state.doc
    let plainText = ''

    const processNode = (node: ProseMirrorNode) => {
      // Check if node is a list item or is inside a list
      const isList = node.type.name === 'bulletList' || node.type.name === 'orderedList'
      const isListItem = node.type.name === 'listItem'
      const isParagraph = node.type.name === 'paragraph'
      const isOrderedList = node.type.name === 'orderedList'
      const isHeading = node.type.name === 'heading'

      if (isList) {
        // Ensure list starts on a new line if there's content before it
        if (plainText && !plainText.endsWith('\n')) {
          plainText += '\n'
        }
        let itemNumber = 1
        node.content.forEach((listItem: ProseMirrorNode) => {
          if (isOrderedList) {
            plainText += `${itemNumber}. ` + listItem.textContent + '\n'
            itemNumber++
          } else {
            plainText += '- ' + listItem.textContent + '\n'
          }
        })
      } else if (isListItem) {
        // For individual list items, default to bullet points
        // since we can't know their number in the original list
        if (plainText && !plainText.endsWith('\n')) {
          plainText += '\n'
        }
        plainText += '- ' + node.textContent + '\n'
      } else if (isParagraph || isHeading) {
        // Handle paragraphs and headings - ensure they end with a newline
        const text = node.textContent
        if (text && text.trim()) {
          plainText += text + '\n'
        }
      } else if (node.content && node.content.childCount > 0) {
        // Process nodes with content
        node.content.forEach((child: ProseMirrorNode, i: number) => {
          processNode(child)
          // Add newline between nodes except for the last one, unless it's a paragraph or heading
          if (i < node.content.childCount - 1 && !isParagraph && !isHeading) {
            plainText += '\n'
          }
        })
      } else {
        // Handle text nodes and other leaf nodes
        const text = node.textContent
        if (text && text.trim()) {
          plainText += text
        }
      }
    }

    fragment.content.forEach((node) => {
      processNode(node)
    })

    // Clean up any extra spacing
    plainText = plainText
      .replace(/\n\s+/g, '\n') // Remove extra spacing at the start of lines
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to max 2
      .trim() // Remove trailing whitespace

    const clipboardData = new ClipboardItem({
      'text/html': new Blob([content], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' })
    })

    navigator.clipboard.write([clipboardData])
    toast.success('Copied to clipboard')
    setIsCopied(true)

    const timeoutId = setTimeout(() => setIsCopied(false), 2000)
    return () => clearTimeout(timeoutId)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        {/* <Toggle
          size="sm"
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          disabled={
            !editor.can().chain().focus().toggleHeading({ level: 1 }).run() ||
            disabled
          }
          pressed={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          disabled={
            !editor.can().chain().focus().toggleHeading({ level: 2 }).run() ||
            disabled
          }
          pressed={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={
            !editor.can().chain().focus().toggleBold().run() || disabled
          }
          pressed={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={
            !editor.can().chain().focus().toggleItalic().run() || disabled
          }
          pressed={editor.isActive("italic")}
          value="italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={
            !editor.can().chain().focus().toggleStrike().run() || disabled
          }
          pressed={editor.isActive("strike")}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Toggle
          className="hidden sm:block"
          size="sm"
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          pressed={editor.isActive("bulletList")}
          disabled={
            !editor.can().chain().focus().toggleBulletList().run() || disabled
          }
        >
          <List className="h-4 w-4" />
        </Toggle>

        <Toggle
          className="hidden sm:block"
          size="sm"
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          pressed={editor.isActive("orderedList")}
          disabled={
            !editor.can().chain().focus().toggleOrderedList().run() || disabled
          }
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
      </div>
      <div className="flex items-center gap-1.5">
        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || disabled}
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || disabled}
        >
          <Redo className="h-4 w-4" />
        </Toggle> */}
        <Button
          type="button"
          variant={'secondary'}
          size={'sm'}
          onClick={handleCopy}
          disabled={disabled}
        >
          <span className="hidden sm:block">Copy</span>
          {isCopied ? <Check className="animate fade-in" /> : <Copy />}
        </Button>
      </div>
    </div>
  )
}
