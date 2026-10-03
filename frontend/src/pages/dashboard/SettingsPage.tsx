import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Lock,
  HardDrive,
  Check,
  AlertCircle,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const SettingsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'storage'>('profile');

  // Profile Form
  const [username, setUsername] = useState(user?.username || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PIN Form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Storage breakdown state
  const [storageData, setStorageData] = useState<{
    storageUsed: number;
    storageLimit: number;
    breakdown: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
    fetchStorage();
  }, [user]);

  const fetchStorage = async () => {
    try {
      const res = await api.security.getStorage();
      setStorageData({
        storageUsed: res.storageUsed,
        storageLimit: res.storageLimit,
        breakdown: res.breakdown,
      });
    } catch (e) {
      // Ignore
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await api.security.updateProfile({ username });
      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      await api.security.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (newPin !== confirmNewPin) {
      setPinMsg({ type: 'error', text: 'New PIN and confirmation PIN do not match.' });
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setPinMsg({ type: 'error', text: 'PIN must be exactly 6 numeric digits.' });
      return;
    }

    try {
      await api.pin.create(newPin, confirmNewPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setPinMsg({ type: 'success', text: 'Security PIN updated successfully.' });
    } catch (err: any) {
      setPinMsg({ type: 'error', text: err.message || 'Failed to update PIN.' });
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-white">Settings & Security</h2>
        <p className="text-xs text-[#8B95A7] mt-1">
          Control your authentication credentials, zero-trust PIN, and quota limits.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl glass-card max-w-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === 'profile'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === 'security'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Security & PIN
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === 'storage'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Storage Quota
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-heading font-semibold text-white">@{user?.username}</h3>
              <p className="text-xs text-gray-400">{user?.email}</p>
              <p className="text-[11px] text-cyan-400 font-mono mt-1">
                Account Active • Zero-Trust Mode Enabled
              </p>
            </div>
          </div>

          {profileMsg && (
            <div
              className={`p-3 rounded-xl text-xs ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm opacity-50 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Security & PIN Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change PIN Form */}
          <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Change Security PIN</h3>
                <p className="text-xs text-gray-400">
                  Update your 6-digit zero-knowledge PIN used for transfer authorization.
                </p>
              </div>
            </div>

            {pinMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  pinMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {pinMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">New 6-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={newPin.length !== 6 || newPin !== confirmNewPin}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-40"
              >
                Update PIN
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <Lock className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Change Password</h3>
                <p className="text-xs text-gray-400">
                  Update your primary account access password.
                </p>
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!currentPassword || newPassword.length < 8}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-40"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Storage Quota Tab */}
      {activeTab === 'storage' && (
        <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-white">Storage Breakdown</h3>
              <p className="text-xs text-gray-400">
                Live metrics from backend storage quota engine.
              </p>
            </div>
          </div>

          {storageData && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-300 mb-2">
                  <span>
                    Used: <b className="text-white">{formatBytes(storageData.storageUsed)}</b>
                  </span>
                  <span>
                    Limit: <b className="text-white">{formatBytes(storageData.storageLimit)}</b>
                  </span>
                </div>
                <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (storageData.storageUsed / storageData.storageLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
                {Object.entries(storageData.breakdown).map(([cat, bytes]) => (
                  <div key={cat} className="p-3 rounded-xl bg-[#05070B] border border-white/5">
                    <span className="text-gray-400 capitalize">{cat}</span>
                    <p className="text-sm font-semibold text-white font-mono mt-1">
                      {formatBytes(bytes)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
