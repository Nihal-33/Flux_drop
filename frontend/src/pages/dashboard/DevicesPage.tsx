import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTransfers } from '../../context/TransferContext';
import { api } from '../../services/api';
import { Device } from '../../types';

export const DevicesPage: React.FC = () => {
  const { currentDevice } = useAuth();
  const { devices, refreshDevices } = useTransfers();

  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  const startRename = (device: Device) => {
    setEditingDeviceId(device.id);
    setEditName(device.deviceName);
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await api.devices.update(id, { deviceName: editName.trim() });
      setEditingDeviceId(null);
      await refreshDevices();
    } catch (e) {
      alert('Failed to rename device');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrusted = async (device: Device) => {
    try {
      await api.devices.update(device.id, { isTrusted: !device.isTrusted });
      await refreshDevices();
    } catch (e) {
      alert('Failed to update device security settings');
    }
  };

  const revokeDevice = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to revoke access for ${name}?`)) {
      try {
        await api.devices.revoke(id);
        await refreshDevices();
      } catch (e) {
        alert('Failed to revoke device');
      }
    }
  };

  const getDeviceIcon = (type: Device['deviceType']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-6 h-6 text-indigo-400" />;
      case 'tablet':
        return <Tablet className="w-6 h-6 text-purple-400" />;
      case 'desktop':
        return <Monitor className="w-6 h-6 text-blue-400" />;
      default:
        return <Laptop className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">My Devices</h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Manage hardware identities connected to your secure transfer workspace.
          </p>
        </div>

        <Link
          to="/receive"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Device</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((device) => {
          const isCurrent = device.id === currentDevice?.id;
          const isEditing = editingDeviceId === device.id;

          return (
            <div
              key={device.id}
              className={`p-6 rounded-3xl glass-panel border transition-all duration-200 ${
                isCurrent ? 'border-cyan-500/40 bg-[#0B0F16]' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {getDeviceIcon(device.deviceType)}
                  </div>
                  <div>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 rounded-lg glass-input text-xs font-semibold"
                          autoFocus
                        />
                        <button
                          onClick={() => saveRename(device.id)}
                          className="p-1 rounded text-cyan-400 hover:bg-white/5"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingDeviceId(null)}
                          className="p-1 rounded text-gray-400 hover:bg-white/5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-white">{device.deviceName}</h4>
                        <button
                          onClick={() => startRename(device)}
                          className="text-gray-400 hover:text-white p-0.5 rounded transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {device.platform} • {device.browser}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  <span className={device.isOnline ? 'text-emerald-400' : 'text-gray-500'}>
                    {device.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Status details & tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2 pb-4 text-[11px]">
                {isCurrent && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-medium">
                    Current Device
                  </span>
                )}
                <span
                  onClick={() => toggleTrusted(device)}
                  className={`px-2.5 py-1 rounded-full border cursor-pointer transition flex items-center gap-1 ${
                    device.isTrusted
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                  title="Click to toggle trusted device"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {device.isTrusted ? 'Trusted Device' : 'Untrusted Device'}
                </span>
                <span className="text-gray-500 font-mono text-[10px]">
                  Last seen: {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Actions footer */}
              {!isCurrent && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <button
                    onClick={() => toggleTrusted(device)}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {device.isTrusted ? 'Mark as untrusted' : 'Mark as trusted'}
                  </button>
                  <button
                    onClick={() => revokeDevice(device.id, device.deviceName)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke access</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
