import * as React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Node as ProseMirrorNode } from 'prosemirror-model'

interface EditorProps {
  editor: ReturnType<typeof useEditor> | null
  placeholder?: string
  disableBubbleMenu?: boolean
}

export const Editor = ({ editor }: EditorProps) => {
  if (!editor) return <></>

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()

    const { from, to } = editor.state.selection
    const fragment = editor.state.doc.slice(from, to)

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

    e.clipboardData?.setData('text/plain', plainText)
  }

  return (
    <div className="editor flex h-full flex-col">
      {/* <BubbleMenu
        className={cn(
          "rounded-md border border-border bg-black p-1 shadow-sm sm:hidden",
          disableBubbleMenu && "hidden",
        )}
        tippyOptions={{ duration: 100 }}
        editor={editor}
      >
         <Toggle
          size="sm"
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          disabled={
            !editor.can().chain().focus().toggleHeading({ level: 1 }).run()
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
            !editor.can().chain().focus().toggleHeading({ level: 2 }).run()
          }
          pressed={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          className="mr-1"
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          pressed={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          className="mr-1"
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          pressed={editor.isActive("italic")}
          value="italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          className="mr-1"
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          pressed={editor.isActive("strike")}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          className="mr-1"
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          pressed={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          className="mr-1"
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          pressed={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle> 
      </BubbleMenu> */}
      <EditorContent editor={editor} className="size-full grow-1" onCopy={(e) => handleCopy(e)} />
    </div>
  )
}
