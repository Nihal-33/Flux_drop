import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Laptop, ShieldCheck, X, Check, Smartphone, Monitor } from 'lucide-react';
import { useTransfers } from '../../context/TransferContext';

export const IncomingAlertsModal: React.FC = () => {
  const {
    incomingTransfer,
    incomingPairing,
    acceptTransfer,
    rejectTransfer,
    approvePairing,
    dismissIncomingTransfer,
    dismissIncomingPairing,
  } = useTransfers();

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      {/* Incoming Transfer Modal */}
      <AnimatePresence>
        {incomingTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md p-6 rounded-2xl glass-panel border border-cyan-500/30 shadow-2xl relative overflow-hidden"
            >
              {/* Glowing accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Download className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-semibold text-white">Incoming Transfer</h3>
                    <p className="text-xs text-[#8B95A7]">
                      From <span className="text-cyan-400 font-medium">{incomingTransfer.senderDevice?.name || "Connected Device"}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismissIncomingTransfer}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transfer Item details */}
              <div className="glass-card rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="truncate max-w-[240px]">
                    <p className="text-sm font-medium text-white truncate">
                      {incomingTransfer.transfer.items[0]?.filename || 'Transfer Files'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {incomingTransfer.transfer.items.length > 1
                        ? `+${incomingTransfer.transfer.items.length - 1} other files • `
                        : ''}
                      {formatBytes(incomingTransfer.transfer.totalSize)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                    Direct P2P
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => rejectTransfer(incomingTransfer.transfer.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => acceptTransfer(incomingTransfer.transfer.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Accept File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Incoming Pairing Modal */}
      <AnimatePresence>
        {incomingPairing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md p-6 rounded-2xl glass-panel border border-indigo-500/30 shadow-2xl relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-semibold text-white">Device Pairing Request</h3>
                    <p className="text-xs text-[#8B95A7]">Allow this device to join your workspace?</p>
                  </div>
                </div>
                <button
                  onClick={dismissIncomingPairing}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="glass-card rounded-xl p-4 mb-5 space-y-2">
                <div className="flex items-center gap-3">
                  {incomingPairing.requestingDevice.platform.toLowerCase().includes('mobile') ||
                  incomingPairing.requestingDevice.platform.toLowerCase().includes('android') ? (
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Monitor className="w-5 h-5 text-indigo-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {incomingPairing.requestingDevice.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {incomingPairing.requestingDevice.platform} • {incomingPairing.requestingDevice.browser}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => approvePairing(incomingPairing.sessionId, false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => approvePairing(incomingPairing.sessionId, true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve Device
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
