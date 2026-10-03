import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  Download,
  Smartphone,
  Laptop,
  QrCode,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTransfers } from '../../context/TransferContext';
import { api } from '../../services/api';

export const ReceivePage: React.FC = () => {
  const { currentDevice } = useAuth();
  const { refreshDevices } = useTransfers();

  const [pairingData, setPairingData] = useState<{
    pairingCode: string;
    qrPayload: string;
    expiresAt: string;
  } | null>(null);

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generatePairingSession = async () => {
    if (!currentDevice) return;
    try {
      const res = await api.pairing.initiate(currentDevice.id);
      setPairingData({
        pairingCode: res.pairingCode,
        qrPayload: res.qrPayload,
        expiresAt: res.expiresAt,
      });
    } catch (e) {
      console.warn('Pairing session generation error:', e);
    }
  };

  useEffect(() => {
    generatePairingSession();
  }, [currentDevice]);

  const copyCode = () => {
    if (pairingData?.pairingCode) {
      navigator.clipboard.writeText(pairingData.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePairOtherDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || !currentDevice) return;

    setConnecting(true);
    setConnectMsg(null);
    try {
      const res = await api.pairing.requestPairing({
        codeOrToken: inputCode.trim(),
        deviceId: currentDevice.id,
        deviceName: currentDevice.deviceName,
        platform: currentDevice.platform,
        browser: currentDevice.browser,
      });
      setConnectMsg({ type: 'success', text: res.message });
      setInputCode('');
      await refreshDevices();
    } catch (err: any) {
      setConnectMsg({ type: 'error', text: err.message || 'Failed to connect. Please check pairing code.' });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-white">Ready to receive</h2>
        <p className="text-xs text-[#8B95A7] mt-1">
          Keep this screen open to accept incoming transfers or pair a new device with this workstation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Pairing Identity Card (QR & 6-Digit Code) */}
        <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {currentDevice?.deviceName || 'This Device'}
                </h3>
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Broadcasting on Local Mesh
                </p>
              </div>
            </div>

            <button
              onClick={generatePairingSession}
              title="Refresh pairing code"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code Container */}
          <div className="p-6 rounded-2xl bg-[#05070B] border border-white/10 flex flex-col items-center justify-center">
            {pairingData ? (
              <div className="p-3 bg-white rounded-xl shadow-lg shadow-cyan-500/10">
                <QRCodeSVG
                  value={pairingData.qrPayload}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-500 text-xs">
                Generating session...
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-4 text-center">
              Scan with phone camera to instantly connect
            </p>
          </div>

          {/* 6-Digit Pairing Code Display */}
          <div className="mt-6 p-4 rounded-2xl glass-card flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                Pairing Code
              </span>
              <p className="text-2xl font-mono font-bold tracking-widest text-cyan-400 mt-0.5">
                {pairingData?.pairingCode || '------'}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-4">
            Codes expire after 10 minutes and never contain private credentials.
          </p>
        </div>

        {/* Connect Another Device Section */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div>
              <h3 className="text-lg font-heading font-semibold text-white">Connect another device</h3>
              <p className="text-xs text-[#8B95A7] mt-1">
                Enter the 6-digit code or paste the QR payload shown on your other phone or laptop.
              </p>
            </div>

            {connectMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  connectMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {connectMsg.text}
              </div>
            )}

            <form onSubmit={handlePairOtherDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. 482 913"
                  className="w-full px-4 py-3 rounded-xl glass-input text-lg font-mono text-center tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={connecting || !inputCode.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {connecting ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Request Connection</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Transfer Readiness Status card */}
          <div className="p-6 rounded-2xl glass-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Transfer Listener Active</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                When another device sends files, an acceptance prompt will automatically appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
