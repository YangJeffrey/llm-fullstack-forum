import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

type WebSocketMessage = {
  type: string;
  data: any;
};

type WebSocketContextType = {
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  isModerator: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  lastMessage: null,
  sendMessage: () => {},
  connectionStatus: 'disconnected',
  isModerator: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

type WebSocketProviderProps = {
  children: ReactNode;
  url?: string;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8000/ws',
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (typeof window === 'undefined' || !session) return;

    const ws = new WebSocket(url);
    setConnectionStatus('connecting');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');

      // Send authentication message with session token
      if (session?.user?.email) {
        ws.send(
          JSON.stringify({
            token: session.user.email, // Using email as identifier for now
          })
        );
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      // Handle connection confirmation with moderator status
      if (message.type === 'connection_established') {
        setIsModerator(message.data.is_moderator);
      }

      setLastMessage(message);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');

      setTimeout(() => {
        if (session) {
          console.log('Attempting to reconnect WebSocket...');
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url, session]);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ lastMessage, sendMessage, connectionStatus, isModerator }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
