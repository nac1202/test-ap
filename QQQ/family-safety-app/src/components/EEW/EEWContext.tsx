'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

// P2P Quake EEW (code 556) interface
export interface EEWArea {
  pref: string;
  name: string;
  scaleFrom: number;
  scaleTo: number;
  kindCode: string;
  arrivalTime: string;
}

export interface EEWData {
  id: string;
  code: number;
  time: string;
  test: boolean;
  earthquake?: {
    originTime: string;
    arrivalTime: string;
    condition: string;
    hypocenter: {
      name: string;
      reduceName: string;
      latitude: number;
      longitude: number;
      depth: number;
      magnitude: number;
    };
  };
  issue?: {
    time: string;
    eventId: string;
    serial: string;
  };
  areas?: EEWArea[];
}

interface EEWContextType {
  isAlertVisible: boolean;
  alertData: EEWData | null;
  dismissAlert: () => void;
  triggerTestEEW: () => void;
  isConnected: boolean;
}

const EEWContext = createContext<EEWContextType | undefined>(undefined);

export const EEWProvider = ({ children }: { children: ReactNode }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<EEWData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('wss://api.p2pquake.net/v2/ws');

      ws.onopen = () => {
        setIsConnected(true);
        console.log('P2PQuake WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // 556 = 緊急地震警報
          if (data.code === 556) {
            setAlertData(data as EEWData);
            setIsAlertVisible(true);
          }
        } catch (err) {
          console.error('Failed to parse P2PQuake message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('P2PQuake WebSocket disconnected. Reconnecting in 5s...');
        // 5秒後に再接続
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('P2PQuake WebSocket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const dismissAlert = useCallback(() => {
    setIsAlertVisible(false);
  }, []);

  const triggerTestEEW = useCallback(() => {
    const mockData: EEWData = {
      id: "mock-eew-id",
      code: 556,
      time: new Date().toISOString(),
      test: true,
      earthquake: {
        originTime: new Date().toISOString(),
        arrivalTime: new Date().toISOString(),
        condition: "",
        hypocenter: {
          name: "相模湾（テスト）",
          reduceName: "相模湾",
          latitude: 35.0,
          longitude: 139.5,
          depth: 10,
          magnitude: 7.9,
        },
      },
      issue: {
        time: new Date().toISOString(),
        eventId: "test2024",
        serial: "1",
      },
      areas: [
        { pref: "東京都", name: "東京23区", scaleFrom: 50, scaleTo: 60, kindCode: "11", arrivalTime: new Date().toISOString() },
        { pref: "神奈川県", name: "神奈川東部", scaleFrom: 60, scaleTo: 60, kindCode: "11", arrivalTime: new Date().toISOString() }
      ]
    };
    
    setAlertData(mockData);
    setIsAlertVisible(true);
  }, []);

  return (
    <EEWContext.Provider value={{ isAlertVisible, alertData, dismissAlert, triggerTestEEW, isConnected }}>
      {children}
    </EEWContext.Provider>
  );
};

export const useEEW = () => {
  const context = useContext(EEWContext);
  if (context === undefined) {
    throw new Error('useEEW must be used within an EEWProvider');
  }
  return context;
};
