import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-pwa';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-1.5"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="size-3.5" />
      <span>Sin conexion - Mostrando datos guardados</span>
    </div>
  );
}
