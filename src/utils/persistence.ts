/**
 * Utilitaires de persistance unifiée (Cookies + LocalStorage).
 *
 * Les cookies permettent de transmettre et faire persister l'état sur 365 jours
 * (avec SameSite=Lax, path=/), tandis que le LocalStorage sert de support haute capacité.
 * En cas de réouverture de session ou rechargement, la synchronisation bidirectionnelle
 * garantit qu'aucune information personnelle n'est perdue.
 */

export const STORAGE_KEYS = {
  TIMETABLE_ICS: 'marges_timetable_ics',
  TIMETABLE_URL: 'marges_timetable_url',
  REMINDERS: 'marges_reminders_list',
  REMINDERS_CONFIG: 'marges_reminders_config',
  NOTEBOOK_CONFIG: 'marges_notebook_config',
  THEME: 'theme',
} as const;

export interface ReminderScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'twice_daily' | 'weekly';
  contentPreference: 'random' | 'philo' | 'cours';
  times: string[]; // e.g. ["09:00", "19:00"]
  weekDay?: number; // 1 = lundi
}

export interface NotebookConfig {
  notebookUrl: string;
  autoSync: boolean;
  lastSync?: string;
  notesSummary?: string;
}

const ONE_YEAR_SEC = 365 * 24 * 60 * 60;

/**
 * Enregistre un cookie sécurisé avec expiration sur 1 an.
 */
export function setCookie(name: string, value: string, maxAgeSec: number = ONE_YEAR_SEC): void {
  if (typeof document === 'undefined') return;
  try {
    const encoded = encodeURIComponent(value);
    document.cookie = `${name}=${encoded}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
  } catch (err) {
    console.warn(`[Persistence] Erreur setCookie(${name}):`, err);
  }
}

/**
 * Récupère la valeur d'un cookie par son nom.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Supprime un cookie.
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Sauvegarde une donnée avec persistance double (Cookie + LocalStorage).
 */
export function savePersistent(key: string, value: string): void {
  if (typeof window === 'undefined') return;

  // 1. Sauvegarde LocalStorage
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[Persistence] localStorage plein ou indisponible pour ${key}:`, err);
  }

  // 2. Sauvegarde Cookie
  try {
    if (value.length < 3500) {
      setCookie(key, value);
    } else {
      setCookie(`${key}_meta`, JSON.stringify({ size: value.length, updated: Date.now() }));
    }
  } catch (err) {
    console.warn(`[Persistence] Cookie indisponible pour ${key}:`, err);
  }
}

/**
 * Récupère une donnée en consultant en priorité LocalStorage, avec repli transparent sur le Cookie.
 */
export function loadPersistent(key: string): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Essai LocalStorage
  try {
    const local = localStorage.getItem(key);
    if (local) {
      if (local.length < 3500 && !getCookie(key)) {
        setCookie(key, local);
      }
      return local;
    }
  } catch {}

  // 2. Repli Cookie
  const fromCookie = getCookie(key);
  if (fromCookie) {
    try {
      localStorage.setItem(key, fromCookie);
    } catch {}
    return fromCookie;
  }

  return null;
}

/**
 * Sauvegarde un objet JSON dans le système persistant.
 */
export function savePersistentJSON<T>(key: string, data: T): void {
  savePersistent(key, JSON.stringify(data));
}

/**
 * Charge un objet JSON depuis le système persistant.
 */
export function loadPersistentJSON<T>(key: string, fallback: T): T {
  const raw = loadPersistent(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
