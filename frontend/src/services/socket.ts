type EventHandler = (data: any) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  public isConnected = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('fluxdrop_mesh');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type) {
          this.triggerLocal(event.data.type, event.data.payload);
        }
      };
    }
  }

  public connect(token?: string, deviceId?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token || ''}&deviceId=${deviceId || ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.triggerLocal('connection:state', { connected: true });
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.triggerLocal(data.type, data.payload);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.triggerLocal('connection:state', { connected: false });
        this.scheduleReconnect(token, deviceId);
      };

      this.ws.onerror = (err) => {
        console.warn('FluxDrop WebSocket notice, will retry:', err);
      };
    } catch (e) {
      this.isConnected = false;
      this.scheduleReconnect(token, deviceId);
    }
  }

  private scheduleReconnect(token?: string, deviceId?: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token, deviceId);
    }, 3000);
  }

  public on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private triggerLocal(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }

    const wildcards = this.listeners.get('*');
    if (wildcards) {
      wildcards.forEach((h) => h({ type: event, payload: data }));
    }
  }

  public emit(type: string, payload: any = {}, targetDeviceId?: string) {
    const msg = { type, payload, targetDeviceId };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }

    this.triggerLocal(type, payload);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socket = new SocketManager();
