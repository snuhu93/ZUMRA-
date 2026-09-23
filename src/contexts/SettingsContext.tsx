import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsContextValue {
  dataSaver: boolean;
  setDataSaver: (v: boolean) => void;
  autoplayVideos: boolean;
  setAutoplayVideos: (v: boolean) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isOffline: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dataSaver, setDataSaverState] = useState<boolean>(() => {
    const stored = localStorage.getItem('zumra_data_saver');
    return stored === null ? true : stored === 'true'; // ON by default for new users
  });
  const [autoplayVideos, setAutoplayVideosState] = useState<boolean>(() => {
    const stored = localStorage.getItem('zumra_autoplay_videos');
    return stored === null ? false : stored === 'true'; // OFF by default
  });
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('zumra_theme') as ThemeMode) || 'system');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (isDark: boolean) => root.classList.toggle('dark', isDark);
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    apply(theme === 'dark');
  }, [theme]);

  const setDataSaver = (v: boolean) => {
    setDataSaverState(v);
    localStorage.setItem('zumra_data_saver', String(v));
  };
  const setAutoplayVideos = (v: boolean) => {
    setAutoplayVideosState(v);
    localStorage.setItem('zumra_autoplay_videos', String(v));
  };
  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem('zumra_theme', t);
  };

  return (
    <SettingsContext.Provider value={{ dataSaver, setDataSaver, autoplayVideos, setAutoplayVideos, theme, setTheme, isOffline }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
  }
