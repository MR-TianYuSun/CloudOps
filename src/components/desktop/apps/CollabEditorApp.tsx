'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  FileEdit, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Save, Plus, FolderOpen,
  Highlighter, Undo, Redo, Code, Quote, Heading1, Heading2
} from 'lucide-react';

interface DocItem {
  id: number;
  title: string;
  content: string;
  updated_at: string;
  creator_name?: string;
}

export default function CollabEditorApp({ windowId }: { windowId: string }) {
  const [title, setTitle] = useState('未命名文档');
  const [saving, setSaving] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [showDocList, setShowDocList] = useState(true);
  const [lastSaved, setLastSaved] = useState<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-black/30 rounded p-3 font-mono text-sm' } },
      }),
      Placeholder.configure({ placeholder: '开始输入内容...' }),
      Highlight,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p>欢迎使用在线文档编辑器</p><p>你可以在这里编辑富文本内容，支持标题、加粗、斜体、下划线、高亮、列表、对齐等操作。</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-full',
      },
    },
  });

  const getToken = useCallback(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null, []);

  // Load document list
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setDocs(data.data || []); })
      .catch(() => {});
  }, [getToken]);

  const loadDoc = useCallback(async (docId: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentDocId(docId);
        setTitle(data.data.title);
        if (editor && data.data.content) {
          editor.commands.setContent(data.data.content);
        }
        setShowDocList(false);
      }
    } catch (err) {
      console.error('加载文档失败', err);
    }
  }, [editor, getToken]);

  const createNewDoc = useCallback(() => {
    setCurrentDocId(null);
    setTitle('未命名文档');
    if (editor) editor.commands.setContent('');
    setShowDocList(false);
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    const token = getToken();
    try {
      const htmlContent = editor.getHTML();
      const body = { title, content: htmlContent, fileId: null };
      let res: Response;
      if (currentDocId) {
        res = await fetch(`/api/documents/${currentDocId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (data.success) {
        if (!currentDocId && data.data?.id) setCurrentDocId(data.data.id);
        setLastSaved(new Date().toLocaleTimeString());
        // Refresh doc list
        const listRes = await fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } });
        const listData = await listRes.json();
        if (listData.success) setDocs(listData.data || []);
      }
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setSaving(false);
    }
  }, [editor, title, currentDocId, getToken]);

  const toolbarButtons = [
    { icon: Undo, action: () => editor?.chain().focus().undo().run(), title: '撤销', active: false },
    { icon: Redo, action: () => editor?.chain().focus().redo().run(), title: '重做', active: false },
    { divider: true },
    { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), title: '标题1', active: editor?.isActive('heading', { level: 1 }) },
    { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), title: '标题2', active: editor?.isActive('heading', { level: 2 }) },
    { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), title: '粗体', active: editor?.isActive('bold') },
    { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), title: '斜体', active: editor?.isActive('italic') },
    { icon: UnderlineIcon, action: () => editor?.chain().focus().toggleUnderline().run(), title: '下划线', active: editor?.isActive('underline') },
    { icon: Highlighter, action: () => editor?.chain().focus().toggleHighlight().run(), title: '高亮', active: editor?.isActive('highlight') },
    { icon: Code, action: () => editor?.chain().focus().toggleCodeBlock().run(), title: '代码块', active: editor?.isActive('codeBlock') },
    { divider: true },
    { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), title: '无序列表', active: editor?.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), title: '有序列表', active: editor?.isActive('orderedList') },
    { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), title: '引用', active: editor?.isActive('blockquote') },
    { divider: true },
    { icon: AlignLeft, action: () => editor?.chain().focus().setTextAlign('left').run(), title: '左对齐', active: editor?.isActive({ textAlign: 'left' }) },
    { icon: AlignCenter, action: () => editor?.chain().focus().setTextAlign('center').run(), title: '居中', active: editor?.isActive({ textAlign: 'center' }) },
    { icon: AlignRight, action: () => editor?.chain().focus().setTextAlign('right').run(), title: '右对齐', active: editor?.isActive({ textAlign: 'right' }) },
  ];

  if (!editor) return null;

  return (
    <div className="w-full h-full flex bg-[#0d0f1a]/95">
      {/* 文档列表侧栏 */}
      {showDocList && (
        <div className="w-56 border-r border-border/20 bg-[#0a0c16]/80 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/10">
            <span className="text-xs font-medium text-foreground/70">我的文档</span>
            <button onClick={createNewDoc} className="p-1 rounded hover:bg-white/5 text-primary transition-colors" title="新建文档">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {docs.length === 0 ? (
              <div className="px-3 py-6 text-center text-[10px] text-muted-foreground/40">
                暂无文档<br />点击 + 新建
              </div>
            ) : docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => loadDoc(doc.id)}
                className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-border/5 ${
                  currentDocId === doc.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="text-xs text-foreground/80 truncate">{doc.title}</div>
                <div className="text-[10px] text-muted-foreground/40 mt-0.5">
                  {doc.creator_name} · {doc.updated_at?.slice(0, 16)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 编辑区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
          {!showDocList && (
            <button onClick={() => setShowDocList(true)} className="p-1 rounded hover:bg-white/5 text-muted-foreground transition-colors" title="文档列表">
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}
          <FileEdit className="w-4 h-4 text-primary shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground/90 focus:outline-none border-b border-transparent focus:border-primary/30 transition-colors"
            placeholder="文档标题"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saving ? '保存中...' : '保存'}
          </button>
          {lastSaved && <span className="text-[10px] text-muted-foreground/40">已保存 {lastSaved}</span>}
        </div>

        {/* 工具栏 */}
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 border-b border-border/10 bg-[#0e1020]/30">
          {toolbarButtons.map((btn, idx) => {
            if ('divider' in btn) {
              return <div key={idx} className="w-px h-4 bg-border/30 mx-0.5" />;
            }
            return (
              <button
                key={idx}
                onClick={btn.action}
                className={`p-1.5 rounded transition-colors ${
                  btn.active
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
                title={btn.title}
              >
                <btn.icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* TipTap 编辑区 */}
        <div className="flex-1 overflow-y-auto p-6">
          <EditorContent editor={editor} className="h-full" />
        </div>

        {/* 状态栏 */}
        <div className="flex items-center justify-between px-3 py-1 border-t border-border/10 text-[10px] text-muted-foreground/40">
          <span>字数: {editor.storage.characterCount?.characters?.() ?? editor.getText().length}</span>
          <span>在线编辑器 · {currentDocId ? `文档 #${currentDocId}` : '新文档'}</span>
        </div>
      </div>
    </div>
  );
}
