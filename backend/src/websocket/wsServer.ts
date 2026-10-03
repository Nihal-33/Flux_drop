import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { verifyToken } from '../utils/security.js';
import { db } from '../database/db.js';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  deviceId: string;
  isAlive: boolean;
}

class WsServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const parsedUrl = url.parse(req.url || '', true);
      const token = (parsedUrl.query.token as string) || (req.headers['sec-websocket-protocol'] as string);

      let userId = '';
      let deviceId = '';

      if (token) {
        const decoded = verifyToken<{ userId: string; deviceId?: string }>(token);
        if (decoded) {
          userId = decoded.userId;
          deviceId = decoded.deviceId || (parsedUrl.query.deviceId as string) || '';
        }
      }

      // Allow connection with fallback anonymous / pairing registration
      if (!userId && parsedUrl.query.userId) {
        userId = parsedUrl.query.userId as string;
      }
      if (!deviceId && parsedUrl.query.deviceId) {
        deviceId = parsedUrl.query.deviceId as string;
      }

      const clientInfo: ClientConnection = {
        ws,
        userId,
        deviceId,
        isAlive: true,
      };

      this.clients.set(ws, clientInfo);

      if (deviceId) {
        this.updateDeviceOnlineStatus(deviceId, true);
      }

      // Ping-pong heartbeat
      ws.on('pong', () => {
        const c = this.clients.get(ws);
        if (c) c.isAlive = true;
      });

      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          this.handleClientMessage(ws, message);
        } catch (e) {
          console.error('Invalid WS message payload', e);
        }
      });

      ws.on('close', () => {
        const info = this.clients.get(ws);
        if (info && info.deviceId) {
          this.updateDeviceOnlineStatus(info.deviceId, false);
        }
        this.clients.delete(ws);
      });

      // Send initial connection ack
      ws.send(JSON.stringify({
        type: 'connection:ready',
        payload: { userId, deviceId, timestamp: new Date().toISOString() }
      }));
    });

    // Heartbeat interval
    setInterval(() => {
      for (const [ws, client] of this.clients.entries()) {
        if (!client.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        client.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }

  private updateDeviceOnlineStatus(deviceId: string, isOnline: boolean) {
    const device = db.devices.find(d => d.id === deviceId);
    if (device) {
      device.isOnline = isOnline;
      device.lastSeen = new Date().toISOString();
      db.schedulePersist();

      this.sendToUser(device.userId, {
        type: isOnline ? 'device:online' : 'device:offline',
        payload: { deviceId, isOnline, lastSeen: device.lastSeen }
      });
    }
  }

  private handleClientMessage(senderWs: WebSocket, message: { type: string; targetDeviceId?: string; payload?: any }) {
    const sender = this.clients.get(senderWs);
    if (!sender) return;

    // Handle authentication identification if sent post-handshake
    if (message.type === 'auth:identify') {
      if (message.payload?.userId) sender.userId = message.payload.userId;
      if (message.payload?.deviceId) {
        sender.deviceId = message.payload.deviceId;
        this.updateDeviceOnlineStatus(sender.deviceId, true);
      }
      return;
    }

    // WebRTC signaling relay between devices
    if (message.type.startsWith('webrtc:') || message.type.startsWith('transfer:')) {
      if (message.targetDeviceId) {
        this.sendToDevice(message.targetDeviceId, {
          ...message,
          senderDeviceId: sender.deviceId,
          senderUserId: sender.userId
        });
      } else if (sender.userId) {
        this.sendToUser(sender.userId, message, senderWs);
      }
    }
  }

  public sendToUser(userId: string, message: any, excludeWs?: WebSocket) {
    const data = JSON.stringify(message);
    for (const [ws, client] of this.clients.entries()) {
      if (client.userId === userId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  public sendToDevice(deviceId: string, message: any) {
    const data = JSON.stringify(message);
    for (const [ws, client] of this.clients.entries()) {
      if (client.deviceId === deviceId && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  public broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

export const wsServer = new WsServer();
