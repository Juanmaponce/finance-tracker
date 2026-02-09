import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, LogOut, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import * as userService from '@/services/user.service';

const CURRENCIES = ['USD', 'EUR', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'BRL', 'GBP'];
const LOCALES = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'English' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currency, setCurrency] = useState(user?.primaryCurrency || 'USD');
  const [darkMode, setDarkMode] = useState(user?.darkMode || false);
  const [locale, setLocale] = useState(user?.locale || 'es');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await userService.updateSettings({
        displayName: displayName.trim(),
        primaryCurrency: currency,
        darkMode,
        locale,
      });
      updateUser(updated);
      document.documentElement.classList.toggle('dark', darkMode);
      toast.success('Configuracion guardada');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDarkModeToggle() {
    const next = !darkMode;
    setDarkMode(next);
    // Apply immediately for instant feedback
    document.documentElement.classList.toggle('dark', next);
    updateUser({ darkMode: next });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await userService.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Datos exportados');
    } catch {
      toast.error('Error al exportar datos');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success('Sesion cerrada');
    navigate('/login');
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Configuracion</h1>
        </div>

        {/* Profile section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Perfil</h2>
          <div className="rounded-xl bg-card border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Nombre</Label>
              <Input
                id="settings-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="h-11"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* Preferences section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Preferencias</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {/* Currency */}
            <div className="flex items-center justify-between px-4 py-3">
              <Label htmlFor="settings-currency" className="text-sm font-medium">
                Moneda principal
              </Label>
              <select
                id="settings-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-card text-card-foreground">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Dark mode */}
            <div className="flex items-center justify-between px-4 py-3">
              <Label htmlFor="settings-dark" className="text-sm font-medium">
                Modo oscuro
              </Label>
              <button
                id="settings-dark"
                role="switch"
                aria-checked={darkMode}
                onClick={handleDarkModeToggle}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  darkMode ? 'bg-primary-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform mt-[1px] ${
                    darkMode ? 'translate-x-5 ml-[1px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between px-4 py-3">
              <Label htmlFor="settings-locale" className="text-sm font-medium">
                Idioma
              </Label>
              <select
                id="settings-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground"
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-card text-card-foreground">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !displayName.trim()}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium mb-6"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-4" />
              Guardar cambios
            </span>
          )}
        </Button>

        {/* Data section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Datos</h2>
          <div className="rounded-xl bg-card border border-border">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-xl min-h-[44px]"
            >
              <Download className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {isExporting ? 'Exportando...' : 'Exportar datos'}
                </p>
                <p className="text-xs text-muted-foreground">Descargar en formato JSON</p>
              </div>
            </button>
          </div>
        </section>

        {/* Account section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Cuenta</h2>
          <div className="rounded-xl bg-card border border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-destructive/5 transition-colors rounded-xl min-h-[44px]"
            >
              <LogOut className="size-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">Cerrar sesion</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
