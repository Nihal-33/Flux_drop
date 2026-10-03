import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  FileCode,
  Activity,
  Settings,
  Bell,
  LogOut,
  Shield,
  Plus,
  CheckCircle,
  X,
  Radio,
  HardDrive,
  Receipt,
  Code2,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { FluxDropLogo } from '../brand/FluxDropLogo';
import { CinematicBackground } from '../ui/CinematicBackground';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';

export const DashboardLayout: React.FC = () => {
  const { user, logout, currentDevice } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [storageData, setStorageData] = useState({
    storageUsed: 2.4 * 1024 * 1024 * 1024,
    storageLimit: 10 * 1024 * 1024 * 1024,
  });

  useEffect(() => {
    fetchNotifications();
    fetchStorage();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.list();
      setNotifications(res.notifications);
    } catch (e) {
      // Ignore
    }
  };

  const fetchStorage = async () => {
    try {
      const res = await api.security.getStorage();
      setStorageData({
        storageUsed: res.storageUsed,
        storageLimit: res.storageLimit,
      });
    } catch (e) {
      // Ignore
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      // Ignore
    }
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const storagePercent = Math.min(
    100,
    Math.round((storageData.storageUsed / storageData.storageLimit) * 100)
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Udhar Khata', path: '/udhar', icon: <Receipt className="w-4 h-4 text-emerald-400" /> },
    { label: 'Code Studio', path: '/code', icon: <Code2 className="w-4 h-4 text-cyan-400" /> },
    { label: 'Files & Vault', path: '/files', icon: <FolderOpen className="w-4 h-4 text-blue-400" /> },
    { label: 'Quick Notes', path: '/text', icon: <FileText className="w-4 h-4 text-amber-400" /> },
    { label: 'Saved Links', path: '/links', icon: <LinkIcon className="w-4 h-4 text-pink-400" /> },
    { label: 'Activity Log', path: '/activity', icon: <Activity className="w-4 h-4 text-purple-400" /> },
    { label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4 text-gray-400" /> },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#05070B] text-[#F5F7FA] flex flex-col md:flex-row relative">
      {/* Background cinematic looping video & lighting blooms */}
      <CinematicBackground variant="dashboard" />

      {/* Desktop Sidebar (250px) - Liquid Glass */}
      <aside className="hidden md:flex flex-col w-[250px] shrink-0 liquid-sidebar min-h-screen sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center">
          <Link to="/dashboard">
            <FluxDropLogo size="sm" />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive ? 'liquid-nav-active font-semibold' : 'liquid-nav-inactive'
                }`}
              >
                <span className={isActive ? 'text-[#61f7df]' : 'text-gray-400'}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#61f7df] shadow-[0_0_8px_#61f7df]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Storage & User */}
        <div className="p-4 space-y-3.5">
          {/* Storage Meter - Liquid Glass */}
          <div className="p-3.5 rounded-2xl glass-card border border-white/20 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Storage
              </span>
              <span className="text-white font-mono text-[11px] font-semibold">
                {formatStorage(storageData.storageUsed)} / {formatStorage(storageData.storageLimit)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>

          {/* User Profile Bar - Liquid Glass */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-white/[0.05] border border-white/15 backdrop-blur-md hover:bg-white/[0.08] transition-all">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {currentDevice?.deviceName || 'This Device'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title="Log out"
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6 relative z-10">
        {/* Top Header - Liquid Glass */}
        <header className="h-20 px-6 sm:px-8 liquid-header flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white flex items-center gap-2">
              <span>{getGreeting()},</span>
              <span className="text-gradient-cyan">{user?.username || 'User'}</span>
            </h2>
            <p className="text-xs text-[#8B95A7] hidden sm:block mt-0.5">
              Everything you need to move your data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Cloud Sync Status Badge - Liquid Glass */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-white/20 text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-gray-200 font-medium text-[11px]">Supabase Cloud</span>
            </div>

            {/* Upload Files Quick Action - Liquid Glass */}
            <Link
              to="/files"
              className="px-4 py-2 rounded-xl glass-card hover:border-[#61f7df]/50 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5 text-[#61f7df]" />
              <span className="hidden sm:inline">Upload Files</span>
              <span className="sm:hidden">Upload</span>
            </Link>

            {/* Notifications Dropdown - Liquid Glass */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl glass-card hover:border-white/30 text-gray-200 hover:text-white border border-white/15 relative transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#61f7df] text-[#031310] text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(97,247,223,0.8)]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel border border-white/10 shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 text-center">You're all caught up.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs transition ${
                            n.read ? 'bg-transparent text-gray-400' : 'bg-cyan-500/10 text-white font-medium border border-cyan-500/20'
                          }`}
                        >
                          <p className="font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-gray-300 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Routed Page */}
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Minimum 44px touch targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#070b12]/80 backdrop-blur-2xl border-t border-white/[0.12] flex items-center justify-around z-40 px-2">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl text-[10px] font-medium transition ${
            location.pathname === '/dashboard' ? 'text-[#61f7df]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/udhar"
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl text-[10px] font-medium transition ${
            location.pathname === '/udhar' ? 'text-[#61f7df]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5" />
          <span>Udhar</span>
        </Link>
        <Link
          to="/code"
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl text-[10px] font-medium transition ${
            location.pathname === '/code' ? 'text-[#61f7df]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4 mb-0.5" />
          <span>Code</span>
        </Link>
        <Link
          to="/files"
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl text-[10px] font-medium transition ${
            location.pathname === '/files' ? 'text-[#61f7df]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4 mb-0.5" />
          <span>Files</span>
        </Link>
        <Link
          to="/settings"
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl text-[10px] font-medium transition ${
            location.pathname === '/settings' ? 'text-[#61f7df]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
};

export default DashboardLayout;
