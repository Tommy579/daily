import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

// Clés par défaut (configurables via localStorage dans la page de configuration ou l'interface de connexion)
export const DEFAULT_SUPABASE_CONFIG = {
  URL: 'https://xxxx.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
};

const STORAGE_KEY_URL = 'marges_supabase_url';
const STORAGE_KEY_ANON = 'marges_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_CONFIG.URL, anonKey: DEFAULT_SUPABASE_CONFIG.ANON_KEY, isConfigured: false };
  }

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_ANON);

  const url =
    storedUrl ||
    (import.meta.env.PUBLIC_SUPABASE_URL as string) ||
    (import.meta.env.SUPABASE_URL as string) ||
    DEFAULT_SUPABASE_CONFIG.URL;
  const anonKey =
    storedKey ||
    (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string) ||
    (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.SUPABASE_ANON_KEY as string) ||
    DEFAULT_SUPABASE_CONFIG.ANON_KEY;

  const isConfigured = Boolean(
    url &&
    !url.includes('xxxx.supabase.co') &&
    anonKey &&
    !anonKey.includes('dummy')
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  // Réinitialiser l'instance client
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseCredentials();
  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

// -------------------------------------------------------------
// Fonctions d'authentification
// -------------------------------------------------------------

export async function loginWithPassword(email: string, password: string): Promise<User> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Aucun utilisateur renvoyé par Supabase.');
  return data.user;
}

export async function logoutUser(): Promise<void> {
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
  const sb = getSupabase();
  const { data, error } = await sb
    .from('courses')
    .insert([course])
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const sb = getSupabase();
  const { data, error } = await sb
    .from('schedule_events')
    .insert([event])
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
