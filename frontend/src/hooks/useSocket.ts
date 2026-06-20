import { useEffect, useCallback, useState } from 'react';
import { socketManager } from '../lib/socket';

export const useSocket = (tenantId?: string, tableId?: string) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Initialize socket connection
    const socket = socketManager.connect(tenantId);
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // 2. Join general tenant room
    if (tenantId) {
      socketManager.joinRoom(`tenant:${tenantId}`);
    }

    // 3. Join active dining table room
    if (tenantId && tableId) {
      socketManager.joinRoom(`tenant:${tenantId}:table:${tableId}`);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      
      // Cleanup: leave channels
      if (tenantId) {
        socketManager.leaveRoom(`tenant:${tenantId}`);
      }
      if (tenantId && tableId) {
        socketManager.leaveRoom(`tenant:${tenantId}:table:${tableId}`);
      }
    };
  }, [tenantId, tableId]);

  // Safe subscription method with automatic unmounting cleanups
  const subscribeToEvent = useCallback((eventName: string, callback: (...args: any[]) => void) => {
    const socket = socketManager.socket;
    if (!socket) return () => { };

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, []);

  // Safe emission method
  const emitEvent = useCallback((eventName: string, data: any) => {
    const socket = socketManager.socket;
    if (socket?.connected) {
      socket.emit(eventName, data);
    } else {
      console.warn(`Socket not connected. Queuing event: ${eventName}`);
      socket?.once('connect', () => {
        socket.emit(eventName, data);
      });
    }
  }, []);

  return {
    socket: socketManager.socket,
    subscribeToEvent,
    emitEvent,
    isConnected,
  };
};
