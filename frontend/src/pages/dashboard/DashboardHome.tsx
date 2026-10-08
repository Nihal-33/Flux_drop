import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  FileCode,
  Link as LinkIcon,
  FolderOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  ShieldCheck,
  Zap,
  Plus,
  HardDrive,
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
  Archive,
  Activity,
  FileCheck,
  Code2,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FileRecord, ActivityItem } from '../../types';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalText: 0,
    totalLinks: 0,
    totalUdharBalance: 0,
    totalUdharCustomers: 0,
    storageUsed: 0,
    storageLimit: 10 * 1024 * 1024 * 1024,
  });
  const [loading, setLoading] = useState(true);

  // Load Dashboard Overview Data
  const loadDashboardData = async () => {
    try {
      const [filesRes, textRes, linksRes, activityRes, storageRes, udharRes] = await Promise.all([
        api.files.list({ sort: 'newest' }).catch(() => ({ files: [] })),
        api.text.list().catch(() => ({ items: [] })),
        api.links.list().catch(() => ({ links: [] })),
        api.activity.list().catch(() => ({ activities: [] })),
        api.security.getStorage().catch(() => ({ storageUsed: 0, storageLimit: 10 * 1024 * 1024 * 1024 })),
        api.udhar.getSummary().catch(() => ({ netBalance: 0, customerCount: 0 })),
      ]);

      setRecentFiles(filesRes.files || []);
      setRecentActivities((activityRes.activities || []).slice(0, 5));
      setStats({
        totalFiles: (filesRes.files || []).length,
        totalText: (textRes.items || []).length,
        totalLinks: (linksRes.links || []).length,
        totalUdharBalance: udharRes.netBalance || 0,
        totalUdharCustomers: udharRes.customerCount || 0,
        storageUsed: storageRes.storageUsed || 0,
        storageLimit: storageRes.storageLimit || 10 * 1024 * 1024 * 1024,
      });
    } catch (e) {
      console.warn('Dashboard data fetch warning:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pickedFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...pickedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const totalSelectedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  // Instant Cloud Upload
  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      // Simulate smooth progress ramp
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 15 : p));
      }, 200);

      const res = await api.files.upload(formData);
      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        setSelectedFiles([]);
        loadDashboardData();
      }, 500);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setIsUploading(false);
      alert(err.message || 'File upload failed. Please try again.');
    }
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadSuccess(false);
    setIsUploading(false);
  };

  const handleDownload = async (fileId: string) => {
    try {
      await api.files.download(fileId);
    } catch (e: any) {
      alert(e?.message || 'Download failed');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (mimeType.startsWith('video/')) return <VideoIcon className="w-5 h-5 text-pink-400" />;
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed'))
      return <Archive className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json'))
      return <FileCode className="w-5 h-5 text-cyan-400" />;
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Workspace Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Udhar Khata Stat */}
        <Link
          to="/udhar"
          className="p-5 rounded-2xl glass-card border border-[#61f7df]/20 hover:border-[#61f7df]/50 bg-gradient-to-b from-[#61f7df]/[0.03] to-transparent transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8B95A7]">Udhar Khata</span>
            <div className="w-9 h-9 rounded-xl bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-white">
              ₹{Math.abs(stats.totalUdharBalance).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-[#8B95A7]">
              {stats.totalUdharBalance >= 0 ? 'get' : 'owe'}
            </span>
          </div>
          <p className="text-[11px] text-[#61f7df] mt-2 flex items-center gap-1">
            <span>Manage Khata</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Files Stat */}
        <Link
          to="/files"
          className="p-5 rounded-2xl glass-card border border-white/5 hover:border-cyan-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8B95A7]">Cloud Files</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-white">{stats.totalFiles}</span>
            <span className="text-xs text-[#8B95A7]">items</span>
          </div>
          <p className="text-[11px] text-cyan-400 mt-2 flex items-center gap-1">
            <span>Browse library</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Text & Code Stat */}
        <Link
          to="/text"
          className="p-5 rounded-2xl glass-card border border-white/5 hover:border-indigo-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8B95A7]">Text & Snippets</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCode className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-white">{stats.totalText}</span>
            <span className="text-xs text-[#8B95A7]">saved</span>
          </div>
          <p className="text-[11px] text-indigo-400 mt-2 flex items-center gap-1">
            <span>Manage snippets</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Links Stat */}
        <Link
          to="/links"
          className="p-5 rounded-2xl glass-card border border-white/5 hover:border-pink-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8B95A7]">Saved Links</span>
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-white">{stats.totalLinks}</span>
            <span className="text-xs text-[#8B95A7]">bookmarks</span>
          </div>
          <p className="text-[11px] text-pink-400 mt-2 flex items-center gap-1">
            <span>View bookmarks</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Cloud Storage Stat */}
        <div className="p-5 rounded-2xl glass-card border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8B95A7]">Cloud Storage</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-white">{formatBytes(stats.storageUsed)}</span>
            <span className="text-xs text-[#8B95A7]">/ {formatBytes(stats.storageLimit)}</span>
          </div>
          <div className="w-full h-1.5 bg-black/40 rounded-full mt-3 overflow-hidden border border-white/5">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((stats.storageUsed / (stats.storageLimit || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Instant File Upload Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-[80px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-heading font-bold text-white">Upload Files to Cloud</h3>
            <p className="text-xs text-[#8B95A7]">
              Store documents, code, images and archives securely in your Supabase workspace.
            </p>
          </div>

          {/* Quick shortcuts */}
          <div className="flex items-center gap-2">
            <Link
              to="/files?action=write-code"
              className="px-3 py-1.5 rounded-xl bg-[#61f7df]/10 hover:bg-[#61f7df]/20 border border-[#61f7df]/30 text-xs font-semibold text-[#61f7df] flex items-center gap-1.5 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Write Code</span>
            </Link>
            <Link
              to="/text"
              className="px-3 py-1.5 rounded-xl glass-card text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Snippet</span>
            </Link>
            <Link
              to="/links"
              className="px-3 py-1.5 rounded-xl glass-card text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <LinkIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>Save Link</span>
            </Link>
          </div>
        </div>

        {/* Upload Success View */}
        {uploadSuccess ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-heading font-bold text-white">Files Uploaded Successfully!</h4>
              <p className="text-xs text-gray-400 mt-1">
                Your content is stored safely in your cloud workspace.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={resetUpload}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
              >
                Upload More
              </button>
              <Link
                to="/files"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>View in Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ) : isUploading ? (
          /* Uploading Progress View */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center max-w-md mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto animate-pulse">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Uploading to Cloud Storage...</h4>
              <p className="text-xs text-gray-400 mt-1">
                {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} • {formatBytes(totalSelectedSize)}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Encrypting & Storing</span>
                <span className="text-cyan-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        ) : selectedFiles.length > 0 ? (
          /* Selected Files List & Confirm Upload */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">
                  Selected Files ({selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} • {formatBytes(totalSelectedSize)})
                </span>
                <button onClick={resetUpload} className="text-xs text-gray-400 hover:text-white transition">
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200"
                  >
                    <span className="truncate max-w-[180px]">{file.name}</span>
                    <span className="text-[10px] text-gray-400">({formatBytes(file.size)})</span>
                    <button onClick={() => removeFile(idx)} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add more files</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadFiles}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Now</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Dropzone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 group bg-white/[0.01] hover:bg-cyan-500/[0.02]"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white">
              Drop files here, or <span className="text-cyan-400 underline decoration-cyan-400/40">browse</span>
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Images, 4K videos, documents, source code, archives up to 5GB.
            </p>
          </div>
        )}
      </div>

      {/* Recent Files Table / List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-heading font-semibold text-white">Recent Files</h4>
          </div>
          <Link to="/files" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            <span>View all files</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden">
          {recentFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No files uploaded yet. Drop your first file above to get started.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentFiles.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-heading font-semibold text-white">Recent Activity</h4>
          </div>
          <Link to="/activity" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            <span>View audit log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden">
          {recentActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                        {act.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {act.ipHash || 'Cloud'} • {new Date(act.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                    {act.type.split(':')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
