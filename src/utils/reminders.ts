import { STORAGE_KEYS, savePersistentJSON, loadPersistentJSON, type ReminderScheduleConfig } from './persistence';
import {
  getCurrentSession,
  fetchUserReminders,
  createUserReminder,
  deleteUserReminder,
  type DbReminder,
} from './supabase';

export const DEFAULT_REMINDERS_CONFIG: ReminderScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  times: ['09:00'],
  weekday: 1,
  contentType: 'all',
};

const DAY_NAMES = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function formatFrequencyLabel(config: ReminderScheduleConfig): string {
  if (!config.enabled) return 'Désactivé';
  if (config.frequency === 'daily') return 'Quotidienne (chaque jour)';
  if (config.frequency === 'twice_daily') return 'Deux fois par jour (Matin & Soir)';
  if (config.frequency === 'weekly') {
    const day = DAY_NAMES[config.weekday || 1] || 'Lundi';
    return `Hebdomadaire (Chaque ${day})`;
  }
  return 'Quotidienne';
}

export function formatTimesLabel(config: ReminderScheduleConfig): string {
  if (!config.enabled) return 'Aucun horaire';
  if (config.times && config.times.length > 0) {
    return config.times.join(' & ');
  }
  return '09:00';
}

export function formatContentLabel(config: ReminderScheduleConfig): string {
  if (config.contentType === 'philo') return 'Textes de philosophie uniquement';
  if (config.contentType === 'cours') return 'Supports de cours uniquement';
  return 'Aléatoire (Textes philo & Cours)';
}

/**
 * Récupère la configuration synchronisée (Supabase + localStorage).
 */
export async function getUnifiedReminderConfig(): Promise<ReminderScheduleConfig> {
  let localConfig = loadPersistentJSON<ReminderScheduleConfig>(
    STORAGE_KEYS.REMINDERS_CONFIG,
    DEFAULT_REMINDERS_CONFIG
  );

  // Normalisation des champs historiques
  if (localConfig.contentPreference && !localConfig.contentType) {
    localConfig.contentType = localConfig.contentPreference === 'random' ? 'all' : localConfig.contentPreference;
  }
  if (localConfig.weekDay && !localConfig.weekday) {
    localConfig.weekday = localConfig.weekDay;
  }

  try {
    const session = await getCurrentSession();
    if (session && session.user) {
      const dbReminders = await fetchUserReminders();
      const autoReminders = dbReminders.filter((r) => r.label?.startsWith('[Auto]'));
      if (autoReminders.length > 0) {
        const enabled = autoReminders.some((r) => r.enabled);
        const sorted = [...autoReminders].sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
        const times = sorted.map((r) => r.time_of_day.slice(0, 5));
        const first = sorted[0];

        let frequency: 'daily' | 'twice_daily' | 'weekly' = 'daily';
        let weekday = 1;

        if (sorted.length >= 2) {
          frequency = 'twice_daily';
        } else if (first.days_of_week && first.days_of_week.length === 1) {
          frequency = 'weekly';
          weekday = first.days_of_week[0];
        }

        let contentType: 'all' | 'philo' | 'cours' = 'all';
        if (first.kind === 'texte') contentType = 'philo';
        else if (first.kind === 'cours') contentType = 'cours';

        localConfig = {
          enabled,
          frequency,
          times: times.length > 0 ? times : ['09:00'],
          weekday,
          contentType,
        };
        savePersistentJSON(STORAGE_KEYS.REMINDERS_CONFIG, localConfig);
      }
    }
  } catch (err) {
    console.warn('[RemindersSync] Erreur chargement Supabase:', err);
  }

  return localConfig;
}

/**
 * Sauvegarde la configuration dans localStorage ET synchronise dans Supabase.
 */
export async function saveUnifiedReminderConfig(config: ReminderScheduleConfig): Promise<void> {
  savePersistentJSON(STORAGE_KEYS.REMINDERS_CONFIG, config);

  try {
    const session = await getCurrentSession();
    if (!session || !session.user) return;

    const existing = await fetchUserReminders();
    const autoExisting = existing.filter((r) => r.label?.startsWith('[Auto]'));
    for (const r of autoExisting) {
      if (r.id) await deleteUserReminder(r.id);
    }

    if (!config.enabled) return;

    const kind = config.contentType === 'philo' ? 'texte' : (config.contentType === 'cours' ? 'cours' : 'libre');
    const daysOfWeek = config.frequency === 'weekly' ? [config.weekday || 1] : [1, 2, 3, 4, 5, 6, 7];

    if (config.frequency === 'twice_daily') {
      const t1 = config.times[0] || '09:00';
      const t2 = config.times[1] || '18:30';
      await createUserReminder({
        kind,
        label: '[Auto] Rappel quotidien (matin)',
        time_of_day: t1.length === 5 ? `${t1}:00` : t1,
        days_of_week: daysOfWeek,
        enabled: true,
      });
      await createUserReminder({
        kind,
        label: '[Auto] Rappel quotidien (soir)',
        time_of_day: t2.length === 5 ? `${t2}:00` : t2,
        days_of_week: daysOfWeek,
        enabled: true,
      });
    } else {
      const t1 = config.times[0] || '09:00';
      await createUserReminder({
        kind,
        label: config.frequency === 'weekly' ? '[Auto] Rappel hebdomadaire' : '[Auto] Rappel quotidien',
        time_of_day: t1.length === 5 ? `${t1}:00` : t1,
        days_of_week: daysOfWeek,
        enabled: true,
      });
    }
  } catch (err) {
    console.warn('[RemindersSync] Erreur sauvegarde Supabase:', err);
  }
}
