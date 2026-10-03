import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Device } from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentDevice: Device | null;
  hasPin: boolean;
  isPinVerified: boolean;
  isPinLocked: boolean;
  pinLockoutMinutes: number;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ hasPin: boolean }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
  createPin: (pin: string, confirmPin: string) => Promise<void>;
  recoverPinWithQuestion: (answer: string, newPin?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setPinVerifiedState: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fluxdrop_token'));
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [hasPin, setHasPin] = useState<boolean>(true);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(
    !!sessionStorage.getItem('fluxdrop_pin_token')
  );
  const [isPinLocked, setIsPinLocked] = useState<boolean>(false);
  const [pinLockoutMinutes, setPinLockoutMinutes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Detect current client device metadata
  const detectDevice = (): { name: string; type: 'desktop' | 'laptop' | 'mobile' | 'tablet'; platform: string; browser: string } => {
    const ua = navigator.userAgent;
    let type: 'desktop' | 'laptop' | 'mobile' | 'tablet' = 'laptop';
    let platform = 'Windows PC';
    let browser = 'Chrome';

    if (/iPad|Tablet/i.test(ua)) type = 'tablet';
    else if (/Mobile|Android|iPhone/i.test(ua)) type = 'mobile';
    else if (/Macintosh/i.test(ua)) { platform = 'macOS'; type = 'laptop'; }
    else if (/Linux/i.test(ua)) { platform = 'Linux'; type = 'desktop'; }

    if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    const savedName = localStorage.getItem('fluxdrop_device_custom_name');
    const defaultName = savedName || `${platform} ${type === 'mobile' ? 'Phone' : type === 'tablet' ? 'Tablet' : 'Workstation'}`;

    return { name: defaultName, type, platform, browser };
  };

  const registerCurrentDevice = async (existingId?: string) => {
    try {
      const meta = detectDevice();
      const res = await api.devices.register({
        deviceName: meta.name,
        deviceType: meta.type,
        platform: meta.platform,
        browser: meta.browser,
        existingDeviceId: existingId,
      });

      setCurrentDevice(res.device);
      localStorage.setItem('fluxdrop_device_id', res.device.id);
      return res.device;
    } catch (e) {
      console.error('Failed to register current device:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    try {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.auth.getMe();
      setUser(res.user);
      setHasPin(res.hasPin);
      setIsPinLocked(res.isPinLocked);

      const savedDeviceId = localStorage.getItem('fluxdrop_device_id') || undefined;
      const registered = await registerCurrentDevice(savedDeviceId);

      // Connect socket with token and device
      socket.connect(token, registered?.id);
    } catch (e) {
      console.warn('Profile fetch error, clearing session:', e);
      localStorage.removeItem('fluxdrop_token');
      sessionStorage.removeItem('fluxdrop_pin_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const login = async (identifier: string, password: string) => {
    const res = await api.auth.login({ identifier, password });
    localStorage.setItem('fluxdrop_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setHasPin(res.hasPin);

    // If user has no PIN yet, prompt creation; else verify PIN
    setIsPinVerified(false);
    sessionStorage.removeItem('fluxdrop_pin_token');

    const registered = await registerCurrentDevice();
    socket.connect(res.token, registered?.id);

    return { hasPin: res.hasPin };
  };

  const register = async (data: { username: string; email: string; password: string }) => {
    const res = await api.auth.register(data);
    localStorage.setItem('fluxdrop_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setHasPin(false);
    setIsPinVerified(false);

    const registered = await registerCurrentDevice();
    socket.connect(res.token, registered?.id);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('fluxdrop_token');
      sessionStorage.removeItem('fluxdrop_pin_token');
      setToken(null);
      setUser(null);
      setIsPinVerified(false);
      socket.disconnect();
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      const res = await api.pin.verify(pin);
      sessionStorage.setItem('fluxdrop_pin_token', res.pinToken);
      setIsPinVerified(true);
      setIsPinLocked(false);
    } catch (err: any) {
      if (err.message?.includes('locked')) {
        setIsPinLocked(true);
        setPinLockoutMinutes(15);
      }
      throw err;
    }
  };

  const createPin = async (pin: string, confirmPin: string) => {
    const res = await api.pin.create(pin, confirmPin);
    sessionStorage.setItem('fluxdrop_pin_token', res.pinToken);
    setHasPin(true);
    setIsPinVerified(true);
  };

  const recoverPinWithQuestion = async (answer: string, newPin?: string) => {
    const res = await api.pin.recoverWithQuestion({ answer, newPin });
    sessionStorage.setItem('fluxdrop_pin_token', res.pinToken);
    setIsPinVerified(true);
    setIsPinLocked(false);
  };

  const setPinVerifiedState = (status: boolean) => {
    setIsPinVerified(status);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentDevice,
        hasPin,
        isPinVerified,
        isPinLocked,
        pinLockoutMinutes,
        isLoading,
        login,
        register,
        logout,
        verifyPin,
        createPin,
        recoverPinWithQuestion,
        refreshProfile,
        setPinVerifiedState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
