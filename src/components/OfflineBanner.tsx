import { useSettings } from '@/contexts/SettingsContext';

export default function OfflineBanner() {
  const { isOffline } = useSettings();
  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      You're offline. Showing previously loaded content.
    </div>
  );
}
