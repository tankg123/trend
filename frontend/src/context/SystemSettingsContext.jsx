import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api";

const SystemSettingsContext = createContext(null);

export const defaultSystemSettings = {
  brand_name: "ANS Network",
  brand_subtitle: "MCN Manager System",
  logo_mode: "random",
  logo_data_url: "",
  web_title: "ANS Network",
  favicon_data_url: ""
};

function ensureFaviconLink() {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSystemSettings);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    try {
      const res = await api.get("/settings/system");
      setSettings({ ...defaultSystemSettings, ...(res.data.settings || {}) });
    } catch {
      setSettings(defaultSystemSettings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    document.title = settings.web_title || settings.brand_name || defaultSystemSettings.web_title;
    if (settings.favicon_data_url) {
      ensureFaviconLink().href = settings.favicon_data_url;
    }
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      setSettings,
      refreshSettings
    }),
    [settings, loading]
  );

  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>;
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used inside SystemSettingsProvider");
  }
  return context;
}
