import React, { useState, useEffect } from 'react';
import {
  Code2,
  Save,
  Copy,
  Check,
  Trash2,
  Download,
  FileCode,
  Search,
  RefreshCw,
  FolderCode,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import { FileRecord } from '../../types';

interface LanguageOption {
  id: string;
  label: string;
  ext: string;
  defaultFilename: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'python', label: 'Python', ext: '.py', defaultFilename: 'script.py' },
  { id: 'javascript', label: 'JavaScript', ext: '.js', defaultFilename: 'index.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts', defaultFilename: 'types.ts' },
  { id: 'sql', label: 'PostgreSQL / SQL', ext: '.sql', defaultFilename: 'schema.sql' },
  { id: 'html', label: 'HTML5', ext: '.html', defaultFilename: 'index.html' },
  { id: 'json', label: 'JSON Data', ext: '.json', defaultFilename: 'data.json' },
  { id: 'css', label: 'CSS', ext: '.css', defaultFilename: 'styles.css' },
  { id: 'markdown', label: 'Markdown', ext: '.md', defaultFilename: 'README.md' },
];

export const CodeStudioPage: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGES[1]);
  const [filename, setFilename] = useState<string>(LANGUAGES[1].defaultFilename);
  const [code, setCode] = useState<string>('');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const [savedCodes, setSavedCodes] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCodeFiles();
  }, []);

  const fetchCodeFiles = async () => {
    setLoading(true);
    try {
      const res = await api.files.list({ category: 'code' });
      setSavedCodes(res.files || []);
    } catch (e) {
      console.warn('Error loading code files:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (lang: LanguageOption) => {
    setSelectedLang(lang);
    if (!activeFileId) {
      const currentBase = filename.includes('.')
        ? filename.substring(0, filename.lastIndexOf('.'))
        : filename;
      setFilename(`${currentBase || 'snippet'}${lang.ext}`);
    }
  };

  const handleNewSnippet = () => {
    setActiveFileId(null);
    setFilename(selectedLang.defaultFilename);
    setCode('');
  };

  const handleLoadFile = async (file: FileRecord) => {
    setActiveFileId(file.id);
    const safeName = file.originalName || 'snippet.js';
    setFilename(safeName);
    const matchedLang = LANGUAGES.find((l) => safeName.endsWith(l.ext)) || LANGUAGES[1];
    setSelectedLang(matchedLang);

    try {
      const res = await api.files.getCodeContent(file.id);
      setCode(res.content || '');
    } catch (err) {
      console.warn('Error reading code content:', err);
      setCode('');
    }
  };

  const handleSaveCode = async () => {
    setSaving(true);
    try {
      const targetFilename = filename.trim().includes('.')
        ? filename.trim()
        : `${filename.trim() || 'snippet'}${selectedLang.ext}`;

      if (activeFileId) {
        await api.files.updateCodeContent(activeFileId, code);
      } else {
        const res = await api.files.createCode({
          filename: targetFilename,
          content: code,
        });
        setActiveFileId(res.file.id);
        setFilename(res.file.originalName);
      }
      await fetchCodeFiles();
    } catch (e: any) {
      alert(e.message || 'Failed to save code snippet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this code snippet?')) return;
    try {
      await api.files.delete(id);
      if (activeFileId === id) {
        handleNewSnippet();
      }
      await fetchCodeFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'snippet.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut handler (Tab key for 2-space indentation & Ctrl+S / Cmd+S for saving)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveCode();
    }
  };

  const filteredCodes = savedCodes.filter((f) =>
    (f.originalName || '').toLowerCase().includes(search.toLowerCase())
  );

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
              <Code2 className="w-5 h-5" />
            </span>
            <span>Code Studio & Snippets</span>
          </h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Write, edit, and synchronize multi-language source code with your Supabase vault.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveCode}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#7effe8] text-[#031310] text-xs font-bold shadow-[0_0_20px_rgba(97,247,223,0.35)] flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : activeFileId ? 'Update Cloud' : 'Save to Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: Saved Snippets Explorer */}
        <div className="lg:col-span-1 glass-card p-4 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <FolderCode className="w-4 h-4 text-cyan-400" />
              <span>Vault Snippets</span>
            </span>
            <button onClick={fetchCodeFiles} title="Refresh" className="p-1 text-gray-400 hover:text-white transition cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Snippets List */}
          <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {filteredCodes.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                <FileCode className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-50" />
                <span>No saved snippets found. Write code in the editor and click Save.</span>
              </div>
            ) : (
              filteredCodes.map((file) => {
                const isSelected = activeFileId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => handleLoadFile(file)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#61f7df]' : 'text-gray-400'}`} />
                      <div className="truncate">
                        <p className="text-xs font-medium truncate">{file.originalName || 'Untitled'}</p>
                        <p className="text-[10px] text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Clean Code Editor Workspace */}
        <div className="lg:col-span-3 glass-card rounded-3xl overflow-hidden flex flex-col border border-white/15 shadow-2xl">
          {/* Editor Action Bar */}
          <div className="p-4 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename.ext"
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
              />
              <span className="text-[11px] font-mono text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                {selectedLang.label}
              </span>
            </div>

            {/* Language Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                    selectedLang.id === lang.id
                      ? 'bg-cyan-500/20 text-[#61f7df] border border-cyan-500/40 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Quick Actions (Save, Copy, Download, Clear) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCode}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-[#61f7df]/20"
                title="Save snippet to vault (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadCode}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Download Source File"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCode('')}
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
                title="Clear Editor"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clean User-Driven Code Editor Textarea */}
          <div className="relative p-4 flex-1 min-h-[460px] bg-[#03060a]/70 flex flex-col">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck="false"
              autoFocus
              className="w-full h-full flex-1 min-h-[440px] bg-transparent font-mono text-xs sm:text-sm text-gray-100 resize-none focus:outline-none leading-relaxed selection:bg-cyan-500/30 selection:text-cyan-200"
              placeholder="// Write or paste your code here..."
            />
          </div>

          {/* Editor Status Footer */}
          <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#8B95A7]">
            <div className="flex items-center gap-4">
              <span>Lines: {lineCount}</span>
              <span>Chars: {charCount}</span>
              <span>Encoding: UTF-8</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#61f7df] shadow-[0_0_8px_#61f7df]" />
              <span className="text-[#61f7df] font-medium">
                {activeFileId ? 'Vault File Active' : 'Ready to write'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeStudioPage;
