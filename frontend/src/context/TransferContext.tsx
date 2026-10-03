import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Transfer, Device } from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from './AuthContext';

interface IncomingTransferRequest {
  transfer: Transfer;
  senderDevice?: { name: string; platform: string };
}

interface IncomingPairingRequest {
  sessionId: string;
  requestingDevice: {
    id: string;
    name: string;
    platform: string;
    browser: string;
  };
}

interface TransferContextType {
  transfers: Transfer[];
  activeTransfers: Transfer[];
  devices: Device[];
  incomingTransfer: IncomingTransferRequest | null;
  incomingPairing: IncomingPairingRequest | null;
  connectionMode: 'direct' | 'relay';
  refreshTransfers: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  initiateTransfer: (data: {
    receiverDeviceId: string;
    items: Array<{ filename: string; size: number; mimeType: string; fileId?: string }>;
    connectionType?: 'direct' | 'relay';
  }) => Promise<Transfer>;
  acceptTransfer: (transferId: string) => Promise<void>;
  rejectTransfer: (transferId: string) => Promise<void>;
  cancelTransfer: (transferId: string) => Promise<void>;
  approvePairing: (sessionId: string, approved: boolean) => Promise<void>;
  dismissIncomingTransfer: () => void;
  dismissIncomingPairing: () => void;
  triggerSuccessCelebration: () => void;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export const TransferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentDevice } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransferRequest | null>(null);
  const [incomingPairing, setIncomingPairing] = useState<IncomingPairingRequest | null>(null);
  const [connectionMode] = useState<'direct' | 'relay'>('direct');

  const refreshTransfers = async () => {
    if (!user) return;
    try {
      const res = await api.transfers.list({ tab: 'all' });
      setTransfers(res.transfers);
    } catch (e) {
      console.warn('Error fetching transfers:', e);
    }
  };

  const refreshDevices = async () => {
    if (!user) return;
    try {
      const res = await api.devices.list();
      setDevices(res.devices);
    } catch (e) {
      console.warn('Error fetching devices:', e);
    }
  };

  const triggerSuccessCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00E5FF', '#3B82F6', '#8B5CF6', '#10B981'],
    });
  };

  useEffect(() => {
    if (!user) return;

    refreshTransfers();
    refreshDevices();

    // Listen to real-time socket events
    const unsubCreated = socket.on('transfer:created', (data) => {
      setIncomingTransfer(data);
      refreshTransfers();
    });

    const unsubStatus = socket.on('transfer:status_updated', () => {
      refreshTransfers();
    });

    const unsubProgress = socket.on('transfer:progress', (data) => {
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.id === data.transferId) {
            return {
              ...t,
              status: 'transferring',
              items: t.items.map((it) =>
                it.id === data.itemId ? { ...it, progress: data.itemProgress } : it
              ),
            };
          }
          return t;
        })
      );
    });

    const unsubCompleted = socket.on('transfer:completed', (data) => {
      triggerSuccessCelebration();
      refreshTransfers();
      if (incomingTransfer?.transfer.id === data.transferId) {
        setIncomingTransfer(null);
      }
    });

    const unsubPairingReq = socket.on('pairing:incoming_request', (data) => {
      setIncomingPairing(data);
    });

    const unsubDeviceChange = socket.on('device:online', () => refreshDevices());
    const unsubDeviceOffline = socket.on('device:offline', () => refreshDevices());
    const unsubDeviceReg = socket.on('device:registered', () => refreshDevices());
    const unsubDeviceUp = socket.on('device:updated', () => refreshDevices());

    return () => {
      unsubCreated();
      unsubStatus();
      unsubProgress();
      unsubCompleted();
      unsubPairingReq();
      unsubDeviceChange();
      unsubDeviceOffline();
      unsubDeviceReg();
      unsubDeviceUp();
    };
  }, [user]);

  const initiateTransfer = async (data: {
    receiverDeviceId: string;
    items: Array<{ filename: string; size: number; mimeType: string; fileId?: string }>;
    connectionType?: 'direct' | 'relay';
  }) => {
    const res = await api.transfers.create({
      receiverDeviceId: data.receiverDeviceId,
      senderDeviceId: currentDevice?.id,
      items: data.items,
      connectionType: data.connectionType || 'direct',
    });

    await refreshTransfers();

    // Start simulation / streaming progression
    simulateTransferProgress(res.transfer.id, res.transfer.items);

    return res.transfer;
  };

  const simulateTransferProgress = (transferId: string, items: Transfer['items']) => {
    // Notify receiver and start
    api.transfers.start(transferId).catch(() => {});

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        items.forEach((item) => {
          api.transfers.updateProgress(transferId, item.id, 100).catch(() => {});
        });
        api.transfers.complete(transferId).catch(() => {});
      } else {
        items.forEach((item) => {
          api.transfers.updateProgress(transferId, item.id, progress).catch(() => {});
        });
      }
    }, 450);
  };

  const acceptTransfer = async (transferId: string) => {
    if (!currentDevice) return;
    await api.transfers.accept(transferId, currentDevice.id);
    setIncomingTransfer(null);
    await refreshTransfers();
  };

  const rejectTransfer = async (transferId: string) => {
    if (!currentDevice) return;
    await api.transfers.reject(transferId, currentDevice.id, 'Declined by recipient device');
    setIncomingTransfer(null);
    await refreshTransfers();
  };

  const cancelTransfer = async (transferId: string) => {
    if (!currentDevice) return;
    await api.transfers.reject(transferId, currentDevice.id, 'Cancelled by sender');
    await refreshTransfers();
  };

  const approvePairing = async (sessionId: string, approved: boolean) => {
    await api.pairing.decision(sessionId, approved);
    setIncomingPairing(null);
    await refreshDevices();
  };

  const dismissIncomingTransfer = () => setIncomingTransfer(null);
  const dismissIncomingPairing = () => setIncomingPairing(null);

  const activeTransfers = transfers.filter((t) =>
    ['waiting', 'connecting', 'transferring'].includes(t.status)
  );

  return (
    <TransferContext.Provider
      value={{
        transfers,
        activeTransfers,
        devices,
        incomingTransfer,
        incomingPairing,
        connectionMode,
        refreshTransfers,
        refreshDevices,
        initiateTransfer,
        acceptTransfer,
        rejectTransfer,
        cancelTransfer,
        approvePairing,
        dismissIncomingTransfer,
        dismissIncomingPairing,
        triggerSuccessCelebration,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
};

export const useTransfers = () => {
  const context = useContext(TransferContext);
  if (!context) throw new Error('useTransfers must be used within a TransferProvider');
  return context;
};
