export interface UpdateSettingsDTO {
  primaryCurrency?: string;
  darkMode?: boolean;
  locale?: string;
  displayName?: string;
}

export interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  primaryCurrency: string;
  darkMode: boolean;
  locale: string;
  createdAt: Date;
}
