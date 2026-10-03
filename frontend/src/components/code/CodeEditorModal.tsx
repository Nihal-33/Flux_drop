import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  X,
  Save,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Download,
  Terminal,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import { FileRecord } from '../../types';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (file: FileRecord) => void;
  existingFile?: {
    id: string;
    filename: string;
    content: string;
  } | null;
}

interface LanguageOption {
  id: string;
  label: string;
  ext: string;
  defaultFilename: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'python', label: 'Python', ext: '.py', defaultFilename: 'main.py' },
  { id: 'javascript', label: 'JavaScript', ext: '.js', defaultFilename: 'index.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts', defaultFilename: 'types.ts' },
  { id: 'html', label: 'HTML5', ext: '.html', defaultFilename: 'index.html' },
  { id: 'css', label: 'CSS', ext: '.css', defaultFilename: 'styles.css' },
  { id: 'sql', label: 'SQL', ext: '.sql', defaultFilename: 'schema.sql' },
  { id: 'json', label: 'JSON', ext: '.json', defaultFilename: 'config.json' },
  { id: 'markdown', label: 'Markdown', ext: '.md', defaultFilename: 'README.md' },
];

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  existingFile,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGES[0]);
  const [filename, setFilename] = useState('main.py');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (existingFile) {
      setFilename(existingFile.filename);
      setCode(existingFile.content || '');
      // Try to detect language from extension
      const ext = existingFile.filename.includes('.')
        ? `.${existingFile.filename.split('.').pop()?.toLowerCase()}`
        : '';
      const matched = LANGUAGES.find((l) => l.ext === ext);
      if (matched) setSelectedLang(matched);
    } else {
      setSelectedLang(LANGUAGES[0]);
      setFilename(LANGUAGES[0].defaultFilename);
      setCode('');
    }
  }, [existingFile, isOpen]);

  const handleLanguageChange = (lang: LanguageOption) => {
    setSelectedLang(lang);
    if (!existingFile) {
      // Auto update filename extension if user hasn't heavily modified it
      const baseName = filename.includes('.')
        ? filename.substring(0, filename.lastIndexOf('.'))
        : filename || 'file';
      setFilename(`${baseName}${lang.ext}`);
    }
  };

  // Support Tab key indentation inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);

      // Re-position cursor after inserted 2 spaces
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSave = async () => {
    if (!filename.trim()) {
      alert('Please provide a file name.');
      return;
    }

    setIsSaving(true);
    try {
      if (existingFile?.id) {
        // Updating existing file
        const res = await api.files.updateCodeContent(existingFile.id, code);
        onSaved(res.file);
      } else {
        // Creating new code file
        const res = await api.files.createCode({
          filename: filename.trim(),
          content: code,
        });
        onSaved(res.file);
      }
      onClose();
    } catch (err: any) {
      console.error('Save code failed:', err);
      alert(err.message || 'Failed to save code file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate lines for gutter
  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl h-[90vh] max-h-[820px] rounded-3xl glass-panel border border-[#61f7df]/30 shadow-2xl flex flex-col overflow-hidden relative bg-[#090D14]/95"
        >
          {/* Top Neon Accent line */}
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-[#61f7df] to-blue-500 shrink-0" />

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 bg-[#0B0F18]/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#61f7df]/10 border border-[#61f7df]/30 text-[#61f7df] flex items-center justify-center shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-heading font-bold text-white flex items-center gap-2 truncate">
                  <span>{existingFile ? 'Edit Code File' : 'Write & Save Code'}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/20 font-medium">
                    {selectedLang.label}
                  </span>
                </h3>
                <p className="text-[11px] text-[#8B95A7] hidden sm:block">
                  Code files are stored securely in your Supabase cloud files vault.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
                title="Copy code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Language & Filename Control Bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] bg-[#070A10] flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Filename Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-xs text-[#8B95A7] font-medium shrink-0">File:</span>
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="e.g. main.py"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0F1420] border border-white/10 focus:border-[#61f7df]/60 focus:outline-none text-xs font-mono text-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Quick Language Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition shrink-0 ${
                    selectedLang.id === lang.id
                      ? 'bg-[#61f7df]/20 text-[#61f7df] border border-[#61f7df]/40 font-semibold shadow-sm'
                      : 'bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {lang.ext}
                </button>
              ))}
            </div>
          </div>

          {/* Main Code Editor Body with Line Numbers */}
          <div className="flex-1 flex overflow-hidden relative bg-[#070A10]">
            {/* Line Numbers Gutter */}
            <div
              className="w-12 sm:w-14 py-4 pr-3 select-none text-right font-mono text-[11px] sm:text-xs text-[#4A5568] bg-[#05070B] border-r border-white/[0.06] overflow-hidden"
              aria-hidden="true"
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea Code Canvas */}
            <div className="flex-1 relative overflow-auto">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="// Write or paste your code here..."
                className="w-full h-full p-4 font-mono text-[12px] sm:text-sm text-[#E2E8F0] leading-6 bg-transparent resize-none focus:outline-none selection:bg-[#61f7df]/20 selection:text-white"
              />
            </div>
          </div>

          {/* Editor Status Bar & Action Footer */}
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#0B0F18]/90 flex items-center justify-between gap-4 shrink-0">
            {/* Metadata info */}
            <div className="flex items-center gap-3 text-xs text-[#8B95A7] font-mono">
              <span>{lineCount} lines</span>
              <span>•</span>
              <span>{code.length} chars</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline text-[#61f7df]">Tab: 2 spaces</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Code File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
