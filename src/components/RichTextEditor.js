import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-surface-subtle border-b border-border-subtle items-center">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Bold"
      >
        format_bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Italic"
      >
        format_italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('strike') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Strike"
      >
        format_strikethrough
      </button>
      
      <div className="w-px h-5 bg-border-subtle mx-1"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded-md font-jetbrains-mono font-bold text-[14px] leading-none transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Heading"
      >
        H2
      </button>
      
      <div className="w-px h-5 bg-border-subtle mx-1"></div>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Bullet List"
      >
        format_list_bulleted
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Ordered List"
      >
        format_list_numbered
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] transition-colors ${editor.isActive('blockquote') ? 'bg-primary/20 text-primary' : 'text-secondary hover:bg-surface-main hover:text-on-surface'}`}
        title="Quote"
      >
        format_quote
      </button>

      <div className="flex-1"></div>

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] text-secondary hover:bg-surface-main hover:text-on-surface disabled:opacity-30`}
        title="Undo"
      >
        undo
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className={`p-1.5 rounded-md material-symbols-outlined text-[18px] text-secondary hover:bg-surface-main hover:text-on-surface disabled:opacity-30`}
        title="Redo"
      >
        redo
      </button>
    </div>
  )
}

export default function RichTextEditor({ content, onChange, placeholder = "Start writing your content..." }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none min-h-[350px] p-4 md:p-6 text-on-surface text-body-md font-body-md leading-relaxed whitespace-pre-wrap',
      },
    },
  })

  // Sync external content changes (e.g. from AI Generation) into the editor
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Small optimization to prevent cursor jumping if content is identical
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  return (
    <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface-main flex flex-col focus-within:border-primary/50 transition-colors shadow-sm">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="flex-1 custom-scrollbar overflow-y-auto max-h-[600px]" />
    </div>
  )
}
