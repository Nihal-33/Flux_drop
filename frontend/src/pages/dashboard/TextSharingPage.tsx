import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Trash2,
  Share2,
  Code2,
  Save,
  Plus,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { TextItem } from '../../types';

export const TextSharingPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [snippets, setSnippets] = useState<TextItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const languages = [
    'python',
    'javascript',
    'typescript',
    'html',
    'css',
    'sql',
    'json',
    'markdown',
    'cpp',
    'java',
    'plaintext',
  ];

  const extMap: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    markdown: 'md',
    cpp: 'cpp',
    java: 'java',
    plaintext: 'txt',
  };

  const fetchSnippets = async () => {
    try {
      const res = await api.text.list();
      setSnippets(res.items);
    } catch (e) {
      console.warn('Error fetching snippets:', e);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const handleSaveSnippet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await api.text.create({
        title: title.trim() || `${language.toUpperCase()} Snippet`,
        content,
        language,
      });
      setSnippets((prev) => [res.item, ...prev]);
      setTitle('');
      setContent('');
      setSaveSuccessMsg('Saved to Workspace Snippets!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      alert('Failed to save snippet');
    }
  };

  const handleSaveAsCodeFile = async () => {
    if (!content.trim()) return;
    setIsSavingCode(true);

    try {
      const ext = extMap[language] || 'txt';
      const cleanName = title.trim() ? title.trim().replace(/\s+/g, '_') : 'snippet';
      const filename = cleanName.includes('.') ? cleanName : `${cleanName}.${ext}`;

      await api.files.createCode({
        filename,
        content,
      });

      setSaveSuccessMsg(`Saved as code file "${filename}" in Files & Vault!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save code file.');
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this snippet?')) {
      try {
        await api.text.delete(id);
        setSnippets((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        alert('Failed to delete snippet');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Text & Code Sharing</h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Write source code, JSON configs, or markdown notes and save them directly to your cloud vault.
          </p>
        </div>

        <Link
          to="/files?category=code"
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#61f7df] flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <FolderOpen className="w-4 h-4" />
          <span>View Code Files</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-[#61f7df]/10 border border-[#61f7df]/30 text-[#61f7df] text-xs font-semibold flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Box */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Snippet / file name (e.g. main.py)"
                className="px-3.5 py-2 rounded-xl glass-input text-sm flex-1"
              />

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs font-mono bg-[#0B0F16]"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type or paste source code, JSON, or text here..."
                rows={12}
                className="w-full p-4 rounded-2xl glass-input font-mono text-xs sm:text-sm text-cyan-200 resize-none leading-relaxed focus:border-cyan-400"
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-gray-500 font-mono">
                {content.length} characters • {content.split('\n').length} lines
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContent('')}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Clear
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveSnippet()}
                  disabled={!content.trim()}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-white transition disabled:opacity-40"
                >
                  Save as Snippet
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsCodeFile}
                  disabled={isSavingCode || !content.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingCode ? 'Saving...' : 'Save as Code File'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Snippets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Saved Snippets</h3>
            <span className="text-xs text-[#8B95A7] font-mono">{snippets.length} items</span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {snippets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl glass-card text-xs text-gray-500">
                No saved snippets yet.
              </div>
            ) : (
              snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="p-4 rounded-2xl glass-card border border-white/5 hover:border-cyan-500/20 transition space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                      {snip.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {snip.language}
                    </span>
                  </div>

                  <pre className="text-[11px] font-mono text-gray-400 bg-black/40 p-2.5 rounded-xl overflow-x-auto max-h-24">
                    {snip.content}
                  </pre>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-gray-500">
                      {new Date(snip.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(snip.id, snip.content)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition"
                        title="Copy"
                      >
                        {copiedId === snip.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(snip.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
