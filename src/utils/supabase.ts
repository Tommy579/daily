import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';
import { STORAGE_KEYS, deleteCookie } from './persistence';

// Clés officielles du projet Supabase Marges
export const DEFAULT_SUPABASE_CONFIG = {
  URL: 'https://aejqzkoyxhzxavprgyxd.supabase.co',
  ANON_KEY: 'sb_publishable_64uddUzZQyNVozlAS7ZYAg_mwl9Hci-',
};

const STORAGE_KEY_URL = 'marges_supabase_url';
const STORAGE_KEY_ANON = 'marges_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_CONFIG.URL, anonKey: DEFAULT_SUPABASE_CONFIG.ANON_KEY, isConfigured: true };
  }

  let storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  let storedKey = localStorage.getItem(STORAGE_KEY_ANON);

  // Nettoyage automatique des valeurs factices ou obsolètes restées dans le navigateur
  if (storedUrl && (storedUrl.includes('xxxx.supabase.co') || storedUrl.includes('votre-projet') || !storedUrl.startsWith('http'))) {
    localStorage.removeItem(STORAGE_KEY_URL);
    storedUrl = null;
  }
  if (storedKey && (storedKey.includes('dummy') || storedKey.length < 15)) {
    localStorage.removeItem(STORAGE_KEY_ANON);
    storedKey = null;
  }

  const rawUrl =
    storedUrl ||
    (import.meta.env.PUBLIC_SUPABASE_URL as string) ||
    (import.meta.env.SUPABASE_URL as string) ||
    DEFAULT_SUPABASE_CONFIG.URL;
  const rawKey =
    storedKey ||
    (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string) ||
    (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.SUPABASE_ANON_KEY as string) ||
    DEFAULT_SUPABASE_CONFIG.ANON_KEY;

  const url = (rawUrl || DEFAULT_SUPABASE_CONFIG.URL).trim().replace(/\/+$/, '');
  const anonKey = (rawKey || DEFAULT_SUPABASE_CONFIG.ANON_KEY).trim();

  const isConfigured = Boolean(
    url &&
    !url.includes('xxxx.supabase.co') &&
    !url.includes('votre-projet') &&
    anonKey &&
    !anonKey.includes('dummy')
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_URL, url.trim().replace(/\/+$/, ''));
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  // Réinitialiser l'instance client
  supabaseInstance = null;
}

export function resetSupabaseCredentialsToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  supabaseInstance = null;
}

/**
 * Traduit les erreurs réseau Supabase (CORS, adblocker, domaine injoignable)
 * en explications limpides pour l'utilisateur.
 */
export function formatSupabaseError(err: any): string {
  if (!err) return 'Erreur inconnue';
  const msg = err.message || String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('ERR_BLOCKED_BY_CLIENT') ||
    msg.includes('ERR_CONNECTION_REFUSED')
  ) {
    const creds = getSupabaseCredentials();
    return `Impossible de joindre le serveur Supabase (${creds.url}). Causes courantes : 1) Un bloqueur de publicité ou protection de navigation (Brave Shields, uBlock Origin, Privacy Badger) bloque les requêtes vers supabase.co : désactivez-le pour ce site ; 2) Connexion Internet interrompue ; 3) Anciens identifiants corrompus en mémoire locale.`;
  }
  return msg;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  // Si l'instance existe déjà mais ciblait une mauvaise URL factice, on la recrée
  if (supabaseInstance) {
    // @ts-ignore
    const cur: string = supabaseInstance.supabaseUrl || '';
    if (cur.includes('xxxx.supabase.co') || (url && !cur.startsWith(url))) {
      supabaseInstance = null;
    }
  }

  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

/**
 * Nettoie toutes les données privées stockées localement sur la machine (EDT, rappels, cours custom)
 * pour éviter toute contamination entre comptes utilisateurs différents sur le même navigateur.
 */
export function clearLocalUserData(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove = [
    STORAGE_KEYS.TIMETABLE_ICS,
    STORAGE_KEYS.TIMETABLE_URL,
    STORAGE_KEYS.REMINDERS,
    STORAGE_KEYS.REMINDERS_CONFIG,
    STORAGE_KEYS.NOTIFICATIONS_HISTORY,
    'marges_custom_schedule_events',
    'marges_custom_subjects',
    'marges_custom_courses',
  ];
  keysToRemove.forEach((k) => {
    try {
      localStorage.removeItem(k);
      deleteCookie(k);
    } catch {}
  });
}

// -------------------------------------------------------------
// Fonctions d'authentification
// -------------------------------------------------------------

export async function loginWithPassword(email: string, password: string): Promise<User> {
  clearLocalUserData();
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Aucun utilisateur renvoyé par Supabase.');
  return data.user;
}

export async function logoutUser(): Promise<void> {
  clearLocalUserData();
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateUserProfile(metadata: { full_name?: string }): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ data: metadata });
  if (error) throw error;
}

// -------------------------------------------------------------
// Modèles de données Supabase (Courses, Events, Reminders)
// -------------------------------------------------------------

export interface DbCourse {
  id?: string;
  user_id?: string;
  title: string;
  body_md: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DbScheduleEvent {
  id?: string;
  user_id?: string;
  title: string;
  day_of_week: number; // 1 = Lundi, 7 = Dimanche
  start_time: string;  // "08:00:00"
  end_time: string;    // "10:00:00"
  location?: string;
  notes?: string;
  created_at?: string;
}

export interface DbReminder {
  id?: string;
  user_id?: string;
  kind: 'cours' | 'texte' | 'libre';
  label?: string;
  target_slug?: string;
  time_of_day: string;
  days_of_week?: number[];
  enabled: boolean;
  created_at?: string;
}

// -------------------------------------------------------------
// Opérations CRUD sécurisées par RLS
// -------------------------------------------------------------

export async function fetchUserCourses(): Promise<DbCourse[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('courses')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createUserCourse(course: Omit<DbCourse, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DbCourse> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Vous devez être connecté à votre compte pour enregistrer un cours.');
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('courses')
    .insert([{ ...course, user_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createBatchUserCourses(courses: Array<Omit<DbCourse, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<DbCourse[]> {
  if (!courses || courses.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Vous devez être connecté à votre compte pour importer des cours.');
  }
  const coursesWithUser = courses.map((c) => ({
    ...c,
    user_id: user.id,
  }));
  const sb = getSupabase();
  const { data, error } = await sb
    .from('courses')
    .insert(coursesWithUser)
    .select();
  if (error) throw error;
  return data || [];
}

export async function updateUserCourse(id: string, updates: Partial<Omit<DbCourse, 'id' | 'user_id' | 'created_at'>>): Promise<DbCourse> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('courses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUserCourse(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('courses').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchUserScheduleEvents(): Promise<DbScheduleEvent[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('schedule_events')
    .select('*')
    .order('day_of_week')
    .order('start_time');
  if (error) throw error;
  return data || [];
}

export async function createUserScheduleEvent(event: Omit<DbScheduleEvent, 'id' | 'user_id' | 'created_at'>): Promise<DbScheduleEvent> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Vous devez être connecté à votre compte pour enregistrer un créneau.');
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('schedule_events')
    .insert([{ ...event, user_id: user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserScheduleEvent(id: string, updates: Partial<Omit<DbScheduleEvent, 'id' | 'user_id' | 'created_at'>>): Promise<DbScheduleEvent> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('schedule_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUserScheduleEvent(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('schedule_events').delete().eq('id', id);
  if (error) throw error;
}

export async function createBatchUserScheduleEvents(
  events: Array<Omit<DbScheduleEvent, 'id' | 'user_id' | 'created_at'>>
): Promise<DbScheduleEvent[]> {
  if (!events || events.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Vous devez être connecté à votre compte pour enregistrer des créneaux.');
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('schedule_events')
    .insert(events.map((e) => ({ ...e, user_id: user.id })))
    .select();
  if (error) throw error;
  return data || [];
}

export async function clearUserScheduleEvents(): Promise<void> {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!user) return;
  const { error } = await sb
    .from('schedule_events')
    .delete()
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function syncTimetableToSupabase(data: {
  icsContent?: string;
  icsUrl?: string;
}): Promise<void> {
  const sb = getSupabase();
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) return;

  const currentMeta = user.user_metadata || {};
  const updates: Record<string, any> = {
    ...currentMeta,
    timetable_updated_at: new Date().toISOString(),
  };

  if (data.icsContent !== undefined) {
    updates.timetable_ics = data.icsContent;
  }
  if (data.icsUrl !== undefined) {
    updates.timetable_url = data.icsUrl;
  }

  const { error } = await sb.auth.updateUser({ data: updates });
  if (error) {
    console.warn('[Supabase Sync] Échec updateUser metadata:', error);
    throw error;
  }
}

export async function fetchTimetableFromSupabase(): Promise<{
  icsContent?: string;
  icsUrl?: string;
  updatedAt?: string;
} | null> {
  try {
    const sb = getSupabase();
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return null;

    const meta = user.user_metadata;
    if (!meta) return null;

    return {
      icsContent: typeof meta.timetable_ics === 'string' ? meta.timetable_ics : undefined,
      icsUrl: typeof meta.timetable_url === 'string' ? meta.timetable_url : undefined,
      updatedAt: typeof meta.timetable_updated_at === 'string' ? meta.timetable_updated_at : undefined,
    };
  } catch {
    return null;
  }
}


export async function fetchUserReminders(): Promise<DbReminder[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('reminders')
    .select('*')
    .order('time_of_day');
  if (error) throw error;
  return data || [];
}

export async function createUserReminder(reminder: Omit<DbReminder, 'id' | 'user_id' | 'created_at'>): Promise<DbReminder> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('reminders')
    .insert([reminder])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleUserReminder(id: string, enabled: boolean): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('reminders').update({ enabled }).eq('id', id);
  if (error) throw error;
}

export async function deleteUserReminder(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('reminders').delete().eq('id', id);
  if (error) throw error;
}
