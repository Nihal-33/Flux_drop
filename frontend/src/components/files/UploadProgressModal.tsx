import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Archive,
  Image as ImageIcon,
  Video,
  Music,
  Code2,
  FolderOpen,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';

export interface FileUploadStatusItem {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UploadModalState {
  isOpen: boolean;
  status: 'uploading' | 'completed' | 'error';
  totalFiles: number;
  currentFileIndex: number;
  currentFileName: string;
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  fileStatuses: FileUploadStatusItem[];
  errorMessage?: string;
  successCount: number;
  failedCount: number;
}

interface UploadProgressModalProps {
  state: UploadModalState;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(filename: string) {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <Video className="w-4 h-4 text-blue-400 shrink-0" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return <Music className="w-4 h-4 text-purple-400 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) {
    return <Archive className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'sql', 'md'].includes(ext)) {
    return <Code2 className="w-4 h-4 text-[#61f7df] shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-gray-400 shrink-0" />;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({ state, onClose }) => {
  const isCompleted = state.status === 'completed';
  const isError = state.status === 'error';
  const isUploading = state.status === 'uploading';

  React.useEffect(() => {
    if (isCompleted && state.successCount > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
    }
  }, [isCompleted]);

  if (!state.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isUploading ? undefined : onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#090d16]/95 border border-white/15 p-6 sm:p-7 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl overflow-hidden z-10"
        >
          {/* Top glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#61f7df] to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : isError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-[#61f7df]/10 border-[#61f7df]/30 text-[#61f7df] animate-pulse'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : isError ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-white">
                  {isCompleted
                    ? 'Upload Complete!'
                    : isError
                    ? 'Upload Issue Detected'
                    : 'Uploading to Cloud Vault...'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isCompleted
                    ? `${state.successCount} file${state.successCount === 1 ? '' : 's'} stored securely (${formatBytes(state.totalBytes)})`
                    : isError
                    ? state.errorMessage || 'One or more files could not be uploaded.'
                    : `Uploading ${state.currentFileIndex} of ${state.totalFiles} • ${formatBytes(state.loadedBytes)} / ${formatBytes(state.totalBytes)}`}
                </p>
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Main Progress Bar */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-300 font-medium">
                {isCompleted ? 'Finished' : isError ? 'Progress' : state.currentFileName || 'Processing files...'}
              </span>
              <span className="text-[#61f7df] font-bold">{state.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, state.percent))}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                    : isError
                    ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                    : 'bg-gradient-to-r from-[#61f7df] via-cyan-400 to-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Files List Items */}
          {state.fileStatuses && state.fileStatuses.length > 0 && (
            <div className="mb-5 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex justify-between">
                <span>File Queue ({state.fileStatuses.length})</span>
                <span>
                  {state.successCount} done{state.failedCount > 0 ? ` • ${state.failedCount} failed` : ''}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {state.fileStatuses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {getFileIcon(item.name)}
                      <div className="truncate">
                        <div className="text-white font-medium truncate max-w-[220px] sm:max-w-[280px]">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatBytes(item.size)}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {item.status === 'success' && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Uploaded</span>
                        </span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="flex items-center gap-1.5 text-[11px] text-[#61f7df] font-semibold bg-[#61f7df]/10 px-2 py-0.5 rounded-lg border border-[#61f7df]/20 animate-pulse">
                          <span>Uploading...</span>
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-[11px] text-gray-500 px-2 py-0.5">Waiting</span>
                      )}
                      {item.status === 'error' && (
                        <span
                          title={item.error}
                          className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Large File / 7GB Callout Notice */}
          {state.failedCount > 0 && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice for Large Files or Folders (7GB+)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Cloud vault storage restricts individual file uploads to 50MB. For massive files or 7GB folders, use{' '}
                <strong className="text-white">Direct P2P Drop</strong> in the Transfers tab for unlimited line-speed peer-to-peer transfer!
              </p>
              <Link
                to="/transfers"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#61f7df] hover:underline pt-0.5"
              >
                <span>Go to Direct P2P Transfer</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            {isUploading ? (
              <p className="text-xs text-gray-400 font-mono animate-pulse">
                Please keep this page open while files are uploading...
              </p>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold transition shadow-lg shadow-[#61f7df]/20 cursor-pointer"
              >
                {isCompleted ? 'Done' : 'Close'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
