import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  UploadCloud,
  Grid,
  List,
  Download,
  Trash2,
  Edit2,
  Share2,
  Image,
  Video,
  FileText,
  FileCode,
  Archive,
  Music,
  FileCheck,
  Check,
  X,
  ExternalLink,
  Code2,
  Plus,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { FileRecord } from '../../types';
import { CodeEditorModal } from '../../components/code/CodeEditorModal';

export const FilesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [category, setCategory] = useState<string>(initialCategory);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Code Editor state
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editorFile, setEditorFile] = useState<{
    id: string;
    filename: string;
    content: string;
  } | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Custom sort dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'size-desc', label: 'Largest size' },
    { value: 'size-asc', label: 'Smallest size' },
    { value: 'name', label: 'Alphabetical' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.files.list({ category, search, sort });
      setFiles(res.files);
    } catch (e) {
      console.warn('Error fetching files:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [category, sort]);

  // Check if opened with write-code trigger
  useEffect(() => {
    if (searchParams.get('action') === 'write-code') {
      setShowCodeEditor(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    Array.from(e.target.files).forEach((f) => formData.append('files', f));

    try {
      await api.files.upload(formData);
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleOpenNewCode = () => {
    setEditorFile(null);
    setShowCodeEditor(true);
  };

  const handleEditCodeFile = async (file: FileRecord) => {
    try {
      const res = await api.files.getCodeContent(file.id);
      setEditorFile({
        id: file.id,
        filename: file.originalName,
        content: res.content,
      });
      setShowCodeEditor(true);
    } catch (err: any) {
      alert(err.message || 'Could not load code file content.');
    }
  };

  const handleCodeSaved = (savedFile: FileRecord) => {
    fetchFiles();
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      setDownloadingId(file.id);
      await api.files.download(file.id, file.originalName);
    } catch (e: any) {
      alert(e?.message || 'Could not download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete ${name} from your workspace?`)) {
      try {
        await api.files.delete(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (e) {
        alert('Failed to delete file.');
      }
    }
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await api.files.rename(id, editName.trim());
      setFiles((prev) => prev.map((f) => (f.id === id ? res.file : f)));
      setEditingFileId(null);
    } catch (e) {
      alert('Failed to rename file.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getCategoryIcon = (cat: FileRecord['category']) => {
    switch (cat) {
      case 'images':
        return <Image className="w-6 h-6 text-cyan-400" />;
      case 'videos':
        return <Video className="w-6 h-6 text-blue-400" />;
      case 'audio':
        return <Music className="w-6 h-6 text-purple-400" />;
      case 'archives':
        return <Archive className="w-6 h-6 text-orange-400" />;
      case 'code':
        return <Code2 className="w-6 h-6 text-[#61f7df]" />;
      case 'documents':
        return <FileCheck className="w-6 h-6 text-emerald-400" />;
      default:
        return <FileText className="w-6 h-6 text-gray-400" />;
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'images', label: 'Images' },
    { id: 'videos', label: 'Videos' },
    { id: 'documents', label: 'Documents' },
    { id: 'code', label: 'Code' },
    { id: 'archives', label: 'Archives' },
    { id: 'audio', label: 'Audio' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Code Editor Modal */}
      <CodeEditorModal
        isOpen={showCodeEditor}
        onClose={() => {
          setShowCodeEditor(false);
          setEditorFile(null);
        }}
        onSaved={handleCodeSaved}
        existingFile={editorFile}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Files & Vault</h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Encrypted personal cloud storage with instant previews and cryptographically signed downloads.
          </p>
        </div>

        {/* Hidden File Inputs with targeted accept types */}
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept={
            category === 'images'
              ? 'image/*,.png,.jpg,.jpeg,.gif,.svg,.webp'
              : category === 'documents'
              ? '.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,.csv'
              : category === 'archives'
              ? '.zip,.rar,.7z,.tar,.gz,.bz2'
              : category === 'code'
              ? '.js,.ts,.tsx,.jsx,.py,.html,.css,.json,.sql,.sh,.c,.cpp,.rs,.go,.md'
              : undefined
          }
          className="hidden"
          onChange={handleUpload}
        />
        <input
          ref={videoUploadInputRef}
          type="file"
          multiple
          accept="video/*,.mp4,.webm,.mkv,.avi,.mov"
          className="hidden"
          onChange={handleUpload}
        />
        <input
          ref={audioUploadInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
          className="hidden"
          onChange={handleUpload}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          {category === 'code' && (
            <button
              onClick={handleOpenNewCode}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Write Code</span>
            </button>
          )}

          {category === 'videos' && (
            <button
              onClick={() => videoUploadInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          )}

          {category === 'audio' && (
            <>
              <button
                onClick={() => audioUploadInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition cursor-pointer"
              >
                <Music className="w-4 h-4" />
                <span>Upload Audio</span>
              </button>
              <button
                onClick={() => videoUploadInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Video className="w-4 h-4 text-blue-400" />
                <span>Upload Video</span>
              </button>
            </>
          )}

          {category !== 'videos' && category !== 'audio' && (
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {category === 'images'
                  ? 'Upload Images'
                  : category === 'documents'
                  ? 'Upload Documents'
                  : category === 'archives'
                  ? 'Upload Archives'
                  : category === 'code'
                  ? 'Upload Code'
                  : 'Upload Files'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl glass-card">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              category === c.id
                ? 'bg-[#61f7df]/15 text-[#61f7df] border border-[#61f7df]/30 font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Custom Liquid Glass Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-3.5 py-2 rounded-xl glass-input text-xs flex items-center gap-2.5 hover:border-[#61f7df]/40 transition cursor-pointer"
            >
              <span className="text-white font-medium">
                {SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                  showSortDropdown ? 'rotate-180 text-[#61f7df]' : ''
                }`}
              />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSort(opt.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#61f7df]/15 text-[#61f7df] font-semibold'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#61f7df]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl glass-card">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-[#61f7df]/15 text-[#61f7df]' : 'text-gray-400'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-[#61f7df]/15 text-[#61f7df]' : 'text-gray-400'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {files.length === 0 ? (
        <div className="p-16 text-center rounded-3xl glass-panel border border-white/5 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#61f7df]">
            {category === 'videos' ? (
              <Video className="w-8 h-8 text-blue-400" />
            ) : category === 'audio' ? (
              <Music className="w-8 h-8 text-purple-400" />
            ) : category === 'images' ? (
              <Image className="w-8 h-8 text-cyan-400" />
            ) : category === 'documents' ? (
              <FileCheck className="w-8 h-8 text-emerald-400" />
            ) : category === 'archives' ? (
              <Archive className="w-8 h-8 text-orange-400" />
            ) : category === 'code' ? (
              <Code2 className="w-8 h-8 text-[#61f7df]" />
            ) : (
              <FolderOpen className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">
              {category === 'videos'
                ? 'No videos uploaded yet.'
                : category === 'audio'
                ? 'No audio tracks or media uploaded yet.'
                : category === 'images'
                ? 'No images uploaded yet.'
                : category === 'documents'
                ? 'No documents uploaded yet.'
                : category === 'archives'
                ? 'No archive packages uploaded yet.'
                : category === 'code'
                ? 'No code files created yet.'
                : 'Nothing here yet.'}
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              {category === 'videos'
                ? 'Upload MP4, WebM, MKV, or MOV video files to store and stream from your vault.'
                : category === 'audio'
                ? 'Upload audio recordings, tracks, or video clips to store securely in your vault.'
                : category === 'images'
                ? 'Upload PNG, JPG, SVG, WebP, or GIF image assets to your cloud vault.'
                : category === 'documents'
                ? 'Upload PDF, Word, Excel, or text documents to store securely.'
                : category === 'archives'
                ? 'Upload ZIP, RAR, TAR, or 7Z archives to your vault.'
                : category === 'code'
                ? 'Write Python, JavaScript, TypeScript, HTML, CSS, SQL scripts and save them directly to your cloud storage.'
                : 'Upload files to store and manage them securely in your cloud vault.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {category === 'videos' && (
              <button
                onClick={() => videoUploadInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#61f7df]/20 transition cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Upload Video</span>
              </button>
            )}

            {category === 'audio' && (
              <>
                <button
                  onClick={() => audioUploadInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#61f7df]/20 transition cursor-pointer"
                >
                  <Music className="w-4 h-4" />
                  <span>Upload Audio</span>
                </button>
                <button
                  onClick={() => videoUploadInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <Video className="w-4 h-4 text-blue-400" />
                  <span>Upload Video</span>
                </button>
              </>
            )}

            {category === 'code' && (
              <>
                <button
                  onClick={handleOpenNewCode}
                  className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#61f7df]/20 transition cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Write & Save Code</span>
                </button>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Code File</span>
                </button>
              </>
            )}

            {category !== 'videos' && category !== 'audio' && category !== 'code' && (
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-[#61f7df]/20 transition cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {category === 'images'
                    ? 'Upload Images'
                    : category === 'documents'
                    ? 'Upload Documents'
                    : category === 'archives'
                    ? 'Upload Archives'
                    : 'Upload Files'}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const isEditing = editingFileId === file.id;
            const isCodeFile = file.category === 'code';
            return (
              <div
                key={file.id}
                className={`p-5 rounded-2xl glass-card border transition group flex flex-col justify-between ${
                  isCodeFile
                    ? 'border-[#61f7df]/20 hover:border-[#61f7df]/50 bg-gradient-to-b from-[#61f7df]/[0.02] to-transparent'
                    : 'border-white/5 hover:border-cyan-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {getCategoryIcon(file.category)}
                    </div>
                    {isCodeFile && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/20 font-medium">
                        CODE
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1 mb-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 rounded-lg glass-input text-xs w-full"
                        autoFocus
                      />
                      <button onClick={() => saveRename(file.id)} className="text-cyan-400 p-1">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingFileId(null)} className="text-gray-400 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h4 className="text-sm font-semibold text-white truncate mb-1" title={file.originalName}>
                      {file.originalName}
                    </h4>
                  )}
                  <p className="text-xs text-gray-400 font-mono">{formatBytes(file.size)}</p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    {/* If it's a code file, provide direct editor opening */}
                    {isCodeFile && (
                      <button
                        onClick={() => handleEditCodeFile(file)}
                        title="Edit Code in Playground"
                        className="p-1.5 rounded-lg hover:bg-[#61f7df]/15 hover:text-[#61f7df] text-gray-300 transition"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      title="Download to device"
                      className="p-1.5 rounded-lg hover:bg-white/10 hover:text-cyan-400 transition disabled:opacity-50"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFileId(file.id);
                        setEditName(file.originalName);
                      }}
                      title="Rename"
                      className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id, file.originalName)}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl glass-panel border border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {files.map((file) => {
              const isCodeFile = file.category === 'code';
              return (
                <div
                  key={file.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3.5 truncate">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getCategoryIcon(file.category)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{file.originalName}</h4>
                        {isCodeFile && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/20 font-medium">
                            CODE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatBytes(file.size)} • {file.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCodeFile && (
                      <button
                        onClick={() => handleEditCodeFile(file)}
                        className="px-3 py-1.5 rounded-xl bg-[#61f7df]/10 hover:bg-[#61f7df]/20 text-[#61f7df] border border-[#61f7df]/30 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit Code</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="hidden sm:inline">
                        {downloadingId === file.id ? 'Downloading...' : 'Download'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.originalName)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
