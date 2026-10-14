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

export const TIMETABLE_SYNC_TITLE = '__USER_TIMETABLE_ICS__';
export const SYSTEM_TAG = '__system__';

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

  // Nettoyage de sécurité de tous les jetons d'authentification Supabase locaux
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.includes('-auth-token'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
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

  // Si l'utilisateur avait une ancienne sauvegarde volumineuse dans ses métadonnées, on la purge pour alléger le JWT
  if (data.user.user_metadata?.timetable_ics) {
    sb.auth.updateUser({ data: { timetable_ics: null } }).catch(() => {});
  }

  return data.user;
}

export async function logoutUser(): Promise<void> {
  clearLocalUserData();
  try {
    const sb = getSupabase();
    await sb.auth.signOut();
  } catch (err) {
    console.warn('[Supabase Logout] signOut réseau ignoré (session locale déjà vidée):', err);
  }
  supabaseInstance = null;
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
    .neq('title', TIMETABLE_SYNC_TITLE)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(
    (c) => c.title !== TIMETABLE_SYNC_TITLE && (!c.tags || !c.tags.includes(SYSTEM_TAG))
  );
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

export async function deleteBatchUserCourses(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const sb = getSupabase();
  const { error } = await sb.from('courses').delete().in('id', ids);
  if (error) throw error;
}

export async function clearUserCourses(): Promise<void> {
  const sb = getSupabase();
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    const { error } = await sb
      .from('courses')
      .delete()
      .eq('user_id', user.id)
      .neq('title', TIMETABLE_SYNC_TITLE);
    if (error) throw error;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('marges_custom_courses');
      localStorage.removeItem('marges_custom_subjects');
    } catch {}
  }
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
  const user = await getCurrentUser();
  if (!user) return;

  const currentMeta = user.user_metadata || {};
  const metaUpdates: Record<string, any> = {
    ...currentMeta,
    timetable_updated_at: new Date().toISOString(),
    // On s'assure impérativement que timetable_ics ne reste JAMAIS dans user_metadata
    // pour éviter de saturer la taille des en-têtes HTTP du JWT
    timetable_ics: null,
  };

  if (data.icsUrl !== undefined) {
    metaUpdates.timetable_url = data.icsUrl;
  }

  // 1. Mettre à jour les métadonnées légères dans auth
  try {
    await sb.auth.updateUser({ data: metaUpdates });
  } catch (metaErr) {
    console.warn('[Supabase Sync] Note updateUser metadata:', metaErr);
  }

  // 2. Si un contenu ICS est fourni, on le persiste dans la table courses (avec RLS)
  if (data.icsContent !== undefined) {
    try {
      const { data: existing } = await sb
        .from('courses')
        .select('id')
        .eq('title', TIMETABLE_SYNC_TITLE)
        .maybeSingle();

      if (existing && existing.id) {
        if (!data.icsContent) {
          await sb.from('courses').delete().eq('id', existing.id);
        } else {
          await sb.from('courses').update({
            body_md: data.icsContent,
            tags: [SYSTEM_TAG, 'timetable'],
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      } else if (data.icsContent) {
        await sb.from('courses').insert([{
          user_id: user.id,
          title: TIMETABLE_SYNC_TITLE,
          body_md: data.icsContent,
          tags: [SYSTEM_TAG, 'timetable'],
        }]);
      }
    } catch (dbErr) {
      console.warn('[Supabase Sync] Échec sauvegarde calendrier table courses:', dbErr);
      throw dbErr;
    }
  }
}

export async function fetchTimetableFromSupabase(): Promise<{
  icsContent?: string;
  icsUrl?: string;
  updatedAt?: string;
} | null> {
  try {
    const sb = getSupabase();
    const user = await getCurrentUser();
    if (!user) return null;

    // 1. Lire d'abord depuis la table courses (stockage robuste)
    let icsFromDb: string | undefined;
    let updatedAtFromDb: string | undefined;

    try {
      const { data: row } = await sb
        .from('courses')
        .select('body_md, updated_at')
        .eq('title', TIMETABLE_SYNC_TITLE)
        .maybeSingle();

      if (row && row.body_md) {
        icsFromDb = row.body_md;
        updatedAtFromDb = row.updated_at;
      }
    } catch (e) {
      console.warn('[Supabase Sync] Lecture courses échouée:', e);
    }

    const meta = user.user_metadata || {};
    const legacyIcs = typeof meta.timetable_ics === 'string' ? meta.timetable_ics : undefined;

    // Si un ancien contenu ICS résidait dans user_metadata, on le purge pour alléger le JWT
    if (legacyIcs) {
      sb.auth.updateUser({ data: { timetable_ics: null } }).catch(() => {});
    }

    return {
      icsContent: icsFromDb || legacyIcs,
      icsUrl: typeof meta.timetable_url === 'string' ? meta.timetable_url : undefined,
      updatedAt: updatedAtFromDb || (typeof meta.timetable_updated_at === 'string' ? meta.timetable_updated_at : undefined),
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
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Vous devez être connecté à votre compte pour enregistrer un rappel.');
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from('reminders')
    .insert([{ ...reminder, user_id: user.id }])
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
