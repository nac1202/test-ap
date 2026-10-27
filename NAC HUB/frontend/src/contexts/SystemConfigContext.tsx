import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchPublicSystemSettings } from '../api/admin';
import type { PublicSystemSettingsResponse, SystemVersionInfo } from '../types/admin';

interface SystemConfigContextType {
  systemName: string;
  companyName: string;
  themeColor: string;
  timezone: string;
  maintenanceMode: boolean;
  versionInfo: SystemVersionInfo;
  isLoading: boolean;
  refetchConfig: () => Promise<void>;
}

const DEFAULT_VERSION_INFO: SystemVersionInfo = {
  version: '1.9.0',
  build_number: '20261021',
  updated_at: '2026-10-21',
};

const SystemConfigContext = createContext<SystemConfigContextType>({
  systemName: 'NAC HUB',
  companyName: 'NAC System',
  themeColor: '#FF6B00',
  timezone: 'Asia/Tokyo',
  maintenanceMode: false,
  versionInfo: DEFAULT_VERSION_INFO,
  isLoading: false,
  refetchConfig: async () => {},
});

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicSystemSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPublicSystemSettings();
      setConfig(data);
    } catch (err) {
      console.warn('Failed to load public system settings, falling back to defaults:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const systemName = config?.system_name || 'NAC HUB';
  const companyName = config?.company_name || 'NAC System';
  const themeColor = config?.theme_color || '#FF6B00';
  const timezone = config?.timezone || 'Asia/Tokyo';
  const maintenanceMode = config?.maintenance_mode ?? false;
  const versionInfo = config?.version_info || DEFAULT_VERSION_INFO;

  return (
    <SystemConfigContext.Provider
      value={{
        systemName,
        companyName,
        themeColor,
        timezone,
        maintenanceMode,
        versionInfo,
        isLoading,
        refetchConfig: fetchConfig,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSystemConfig = () => useContext(SystemConfigContext);
