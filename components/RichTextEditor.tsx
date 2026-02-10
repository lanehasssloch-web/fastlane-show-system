'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
      fontFamily: {
        default: null,
        parseHTML: (element) => element.style.fontFamily || null,
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) return {};
          return { style: `font-family: ${attributes.fontFamily}` };
        },
      },
    };
  },
});

export function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize, Color, Underline],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap h-full rounded border bg-white p-3 overflow-y-auto',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  const setFontSize = (size: string) => editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  const setFontFamily = (family: string) => editor.chain().focus().setMark('textStyle', { fontFamily: family }).run();

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap gap-2 rounded border bg-slate-50 p-2 text-sm">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className="rounded border px-2">Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className="rounded border px-2">Italic</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className="rounded border px-2">Underline</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="rounded border px-2">Bullets</button>
        <select onChange={(e) => setFontFamily(e.target.value)} defaultValue="" className="rounded border px-1">
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="'Courier New'">Courier</option>
        </select>
        <select onChange={(e) => setFontSize(e.target.value)} defaultValue="" className="rounded border px-1">
          <option value="">Size</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="22px">22</option>
        </select>
        <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
      </div>
      <EditorContent editor={editor} className="min-h-[20rem] flex-1" />
    </div>
  );
}
