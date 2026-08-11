import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Determine backend address
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    console.log('Connecting socket client to:', backendUrl);
    
    const newSocket = io(backendUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket.io connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    // Clean up connection on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
