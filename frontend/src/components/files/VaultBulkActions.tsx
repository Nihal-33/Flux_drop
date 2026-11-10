import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  ShieldAlert,
  Package,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

interface VaultBulkActionsProps {
  filesCount?: number;
  storageUsedBytes?: number;
  onRefresh?: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const VaultBulkActions: React.FC<VaultBulkActionsProps> = ({
  filesCount = 0,
  storageUsedBytes = 0,
  onRefresh,
}) => {
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    loaded: number;
    total: number;
    currentFile: string;
    percent: number;
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadAllZip = async () => {
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    setZipProgress({ loaded: 0, total: filesCount || 1, currentFile: 'Preparing files...', percent: 0 });

    try {
      await api.files.downloadAllZip((p) => {
        setZipProgress(p);
      });

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }

      showToast('All files successfully bundled and downloaded as ZIP!');
    } catch (err: any) {
      console.error('ZIP download error:', err);
      alert(err.message || 'Failed to download combined ZIP file.');
    } finally {
      setIsDownloadingZip(false);
      setZipProgress(null);
    }
  };

  const handleDeleteAll = async () => {
    if (isDeletingAll) return;
    setIsDeletingAll(true);

    try {
      const res = await api.files.deleteAll();
      setShowDeleteConfirm(false);
      showToast(res.message || 'All files deleted successfully.');
      onRefresh?.();
    } catch (err: any) {
      console.error('Delete all error:', err);
      alert(err.message || 'Failed to delete all files.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <section className="space-y-4">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/10"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#61f7df] flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
              <span>Vault Archive & Bulk Controls</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/20">
                Bulk Management
              </span>
            </h4>
            <p className="text-xs text-[#8B95A7]">
              Download your entire vault as a combined ZIP archive or safely purge storage.
            </p>
          </div>
        </div>

        {filesCount > 0 && (
          <div className="text-xs text-gray-400 font-mono">
            {filesCount} file{filesCount === 1 ? '' : 's'} • {formatBytes(storageUsedBytes)} total
          </div>
        )}
      </div>

      {/* Dedicated Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Combined ZIP Download */}
        <div className="p-5 rounded-3xl glass-panel border border-white/10 hover:border-cyan-500/30 transition-all shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Archive className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-[#61f7df] bg-[#61f7df]/10 border border-[#61f7df]/20 px-2.5 py-1 rounded-xl">
                ZIP Package
              </span>
            </div>

            <h5 className="text-base font-bold text-white mb-1">Download All Files (Combined ZIP)</h5>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Bundle and export all active documents, images, code files, and archives into a single organized ZIP package.
            </p>
          </div>

          {/* Download Progress View */}
          {isDownloadingZip && zipProgress && (
            <div className="space-y-2 mb-4 p-3 rounded-2xl bg-black/40 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-300 truncate max-w-[200px]">{zipProgress.currentFile}</span>
                <span className="text-[#61f7df] font-bold">{zipProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#61f7df] to-cyan-400 rounded-full transition-all duration-200"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-400 font-mono text-right">
                {zipProgress.loaded} of {zipProgress.total} files packed
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownloadAllZip}
            disabled={isDownloadingZip || filesCount === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#61f7df]/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Bundling ZIP Archive ({zipProgress?.percent || 0}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download All Files as ZIP</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Purge Vault / Delete All Files */}
        <div className="p-5 rounded-3xl glass-panel border border-rose-500/15 hover:border-rose-500/30 transition-all shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">
                Permanent Action
              </span>
            </div>

            <h5 className="text-base font-bold text-white mb-1">Purge Cloud Vault (Delete All)</h5>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Permanently wipe all files from your Supabase storage vault and reset your used cloud quota back to 0 B.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={filesCount === 0 || isDeletingAll}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Delete All Files</span>
          </button>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingAll && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md rounded-3xl bg-[#090d16] border border-rose-500/30 p-6 sm:p-7 shadow-2xl shadow-rose-500/20 backdrop-blur-2xl z-10"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-heading font-bold text-white">Permanently Delete All Files?</h4>
                    <p className="text-xs text-rose-300/80">This operation cannot be reversed.</p>
                  </div>
                </div>
                {!isDeletingAll && (
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 text-xs text-gray-300 space-y-2 mb-6">
                <p>
                  You are about to delete <strong className="text-white">{filesCount} file(s)</strong> totaling{' '}
                  <strong className="text-white">{formatBytes(storageUsedBytes)}</strong> from your cloud vault.
                </p>
                <p className="text-rose-300 text-[11px]">
                  All storage objects and database records will be permanently removed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingAll}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Purging Vault...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Yes, Delete Everything</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
