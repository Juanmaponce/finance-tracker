import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/use-pwa';

export function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  async function handleInstall() {
    await install();
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl bg-card border border-border shadow-lg p-4 flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
          <Download className="size-5 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Instalar Finance Tracker</p>
          <p className="text-xs text-muted-foreground">
            Accede mas rapido desde tu pantalla de inicio
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs h-8 px-3"
          >
            Instalar
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
