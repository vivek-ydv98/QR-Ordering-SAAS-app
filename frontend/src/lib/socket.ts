import { io, Socket } from 'socket.io-client';
import { useToastStore } from '../store/useToastStore';

class SocketManager {
  private static instance: SocketManager;
  public socket: Socket | null = null;
  private isConnecting = false;
  private wasConnected = false;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(tenantId?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.qr-ordering.in';

    this.socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      query: tenantId ? { tenantId } : {},
    });

    this.socket.connect();

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('Realtime socket tunnel established:', this.socket?.id);
      if (this.wasConnected) {
        useToastStore.getState().showSuccess('Real-time connection restored.');
      }
      this.wasConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.warn('Realtime socket tunnel disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        useToastStore.getState().showWarning('Real-time connection lost. Reconnecting...');
      }
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      console.error('Socket connection error:', error.message);
      // Only show error on first failed attempt or if previously connected
      if (this.wasConnected) {
        useToastStore.getState().showError('Real-time updates offline.');
        this.wasConnected = false;
      }
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  public joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:join', { room });
    } else {
      this.socket?.once('connect', () => {
        this.socket?.emit('room:join', { room });
      });
    }
  }

  public leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', { room });
    }
  }
}

export const socketManager = SocketManager.getInstance();
