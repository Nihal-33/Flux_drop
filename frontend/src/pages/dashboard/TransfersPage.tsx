import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Smartphone,
  ShieldCheck,
  X,
  FileCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useTransfers } from '../../context/TransferContext';
import { api } from '../../services/api';
import { Transfer } from '../../types';

export const TransfersPage: React.FC = () => {
  const { transfers, refreshTransfers } = useTransfers();

  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received' | 'active' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredTransfers = transfers.filter((t) => {
    if (activeTab === 'active' && !['waiting', 'connecting', 'transferring'].includes(t.status)) return false;
    if (activeTab === 'completed' && t.status !== 'completed') return false;
    if (activeTab === 'failed' && !['failed', 'cancelled', 'expired'].includes(t.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hasMatch =
        t.items.some((it) => it.filename.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q) ||
        (t.senderDeviceName && t.senderDeviceName.toLowerCase().includes(q)) ||
        (t.receiverDeviceName && t.receiverDeviceName.toLowerCase().includes(q));
      if (!hasMatch) return false;
    }

    return true;
  });

  const getStatusBadge = (status: Transfer['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'transferring':
        return (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium animate-pulse flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Transferring
          </span>
        );
      case 'connecting':
      case 'waiting':
        return (
          <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Transfer History</h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Real-time audit record of all cross-device payload transmissions.
          </p>
        </div>

        <button
          onClick={refreshTransfers}
          className="self-start sm:self-auto p-2 rounded-xl glass-card text-gray-400 hover:text-white transition"
          title="Refresh transfers"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-2xl glass-card overflow-x-auto max-w-full">
          {(['all', 'active', 'completed', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search transfers or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Transfers List */}
      <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            No transfers found for the selected view.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTransfers.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTransfer(tx)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition"
              >
                <div className="flex items-center gap-4 truncate">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {tx.items[0]?.filename || 'Payload Transfer'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBytes(tx.totalSize)} • {tx.senderDeviceName || 'Device'} →{' '}
                      {tx.receiverDeviceName || 'Device'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Transfer Drawer Slide-over */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border-l border-white/15 h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-lg font-heading font-bold text-white">Transfer Details</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedTransfer.id}</p>
                </div>
                <button
                  onClick={() => setSelectedTransfer(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status Box */}
                <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
                  <span className="text-xs text-gray-400">Current Status</span>
                  {getStatusBadge(selectedTransfer.status)}
                </div>

                {/* Items List */}
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    Transferred Items ({selectedTransfer.items.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedTransfer.items.map((it) => (
                      <div
                        key={it.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[200px]">
                          <p className="text-white font-medium truncate">{it.filename}</p>
                          <p className="text-gray-400 text-[10px]">{formatBytes(it.size)}</p>
                        </div>
                        <span className="text-cyan-400 font-mono text-[11px]">{it.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Routing & Security Specs */}
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    Security & Protocol Specs
                  </h5>
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#05070B] border border-white/5 flex items-center justify-between">
                      <span className="text-gray-400 font-sans">Transport Channel</span>
                      <span className="text-cyan-400">{selectedTransfer.connectionType.toUpperCase()} (P2P Mesh)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#05070B] border border-white/5 flex items-center justify-between">
                      <span className="text-gray-400 font-sans">Initiated At</span>
                      <span className="text-gray-300">
                        {new Date(selectedTransfer.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedTransfer.completedAt && (
                      <div className="p-3 rounded-xl bg-[#05070B] border border-white/5 flex items-center justify-between">
                        <span className="text-gray-400 font-sans">Completed At</span>
                        <span className="text-emerald-400">
                          {new Date(selectedTransfer.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6">
              <button
                onClick={() => setSelectedTransfer(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
