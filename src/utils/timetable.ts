import ICAL from 'ical.js';
import { STORAGE_KEYS, savePersistent, loadPersistent } from './persistence';
import {
  getSupabaseCredentials,
  getCurrentUser,
  fetchTimetableFromSupabase,
  syncTimetableToSupabase,
  fetchUserScheduleEvents,
  createBatchUserScheduleEvents,
  type DbScheduleEvent,
} from './supabase';

export interface TimetableEvent {

  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  description?: string;
  courseId?: string;
  category?: 'cm' | 'td' | 'tp' | 'habit' | 'other';
}

export interface ReminderItem {
  id: string;
  title: string;
  type: 'texte' | 'cours' | 'custom';
  targetUrl: string;
  targetTitle: string;
  triggerTime: string; // ISO string
  createdTime: string; // ISO string
  status: 'pending' | 'triggered' | 'cancelled';
  notes?: string;
}

export interface WeeklyTemplateEvent {
  dayOffset: number; // 0 = Lundi, 1 = Mardi, 2 = Mercredi, ... 6 = Dimanche
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  title: string;
  location?: string;
  category: 'cm' | 'td' | 'tp' | 'habit' | 'other';
  description?: string;
}

/**
 * Modèle hebdomadaire des cours (issu de votre emploi du temps universitaire)
 */
export const WEEKLY_SCHEDULE_TEMPLATE: WeeklyTemplateEvent[] = [
  // LUNDI (0)
  {
    dayOffset: 0,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 90,
    title: 'CM - Analyse numérique 1 G01',
    location: 'Amphi C',
    description: 'Cours magistral : Méthodes directes et itératives de résolution de systèmes linéaires, conditionnement et interpolation polynomiale.',
    category: 'cm',
  },
  {
    dayOffset: 0,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 120,
    title: 'TD - Analyse numérique 1 G02',
    location: 'Salle E109',
    description: 'Travaux dirigés : Exercices d’application sur les normes matricielles, factorisation LU et méthode de Cholesky. Apporter calculatrice ou support de notes.',
    category: 'td',
  },

  // MARDI (1)
  {
    dayOffset: 1,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 75,
    title: 'CM - Analyse numérique 1 G01',
    description: 'Cours magistral : Méthodes itératives de Jacobi, Gauss-Seidel et relaxation (SOR). Critères de convergence.',
    category: 'cm',
  },
  {
    dayOffset: 1,
    startHour: 10,
    startMinute: 15,
    durationMinutes: 120,
    title: 'TD - EDO & systèmes dynamiques G02/2',
    location: 'Salle E309',
    description: 'Travaux dirigés : Équations différentielles linéaires d’ordre 1 et 2, résolvante, exponentielle de matrice et portraits de phase.',
    category: 'td',
  },
  {
    dayOffset: 1,
    startHour: 13,
    startMinute: 45,
    durationMinutes: 60,
    title: 'CM - Algèbre linéaire numérique',
    description: 'Cours magistral : Décomposition en valeurs singulières (SVD), moindres carrés linéaires et orthogonalisation de Gram-Schmidt.',
    category: 'cm',
  },
  {
    dayOffset: 1,
    startHour: 14,
    startMinute: 45,
    durationMinutes: 135,
    title: 'TD - Algèbre linéaire numérique & matlab G02',
    location: 'Salle B214 (Salle informatique)',
    description: 'Travaux pratiques sur machine : Implémentation des algorithmes de factorisation QR et SVD sous Matlab/Octave.',
    category: 'td',
  },

  // MERCREDI (2)
  {
    dayOffset: 2,
    startHour: 13,
    startMinute: 30,
    durationMinutes: 120,
    title: 'TD - Analyse numérique 1 G02',
    location: 'Salle E109',
    description: 'Travaux dirigés : Intégration numérique (trapèzes, Simpson), calcul d’erreurs et quadrature de Gauss.',
    category: 'td',
  },
  {
    dayOffset: 2,
    startHour: 15,
    startMinute: 45,
    durationMinutes: 120,
    title: "CM - Histoire des sciences et de l'industrie",
    location: 'Salle A231 (Amphi Gradiné)',
    description: 'Cours magistral : Histoire des révolutions techniques et industrielles, genèse du calcul mécanisé et de l’informatique moderne.',
    category: 'cm',
  },

  // JEUDI (3)
  {
    dayOffset: 3,
    startHour: 10,
    startMinute: 15,
    durationMinutes: 120,
    title: 'TD - EDO & systèmes dynamiques G02/2',
    location: 'Salle E309',
    description: 'Travaux dirigés : Systèmes non-linéaires, points d’équilibre, linéarisation et théorème de stabilité de Lyapunov.',
    category: 'td',
  },
  {
    dayOffset: 3,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 180,
    title: 'TD - Langage C G02',
    location: 'Salle Info B204',
    description: 'Programmation en C : Manipulation des pointeurs, allocation dynamique (malloc/free), gestion des structures et fichiers binaires.',
    category: 'td',
  },

  // VENDREDI (4)
  {
    dayOffset: 4,
    startHour: 10,
    startMinute: 0,
    durationMinutes: 120,
    title: 'TD - Matlab & Modélisation G02',
    location: 'Salle Info B102',
    description: 'Simulation numérique : Résolution d’EDO par Runge-Kutta sous Matlab et tracé des trajectoires dans l’espace des phases.',
    category: 'td',
  },
  {
    dayOffset: 4,
    startHour: 14,
    startMinute: 0,
    durationMinutes: 120,
    title: 'CM - Épistémologie & Philosophie des Techniques',
    location: 'Amphi Émilie du Châtelet',
    description: 'Séminaire philosophique : La technique comme milieu humain, critique de l’automatisation et dialogue avec les textes d’Arendt et Simondon.',
    category: 'cm',
  },
];

/**
 * Génère les événements du planning récurrent pour une semaine donnée (commençant le lundi spécifié).
 */
export function generateWeekEvents(monday: Date): Array<{
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  category: 'cm' | 'td' | 'tp' | 'habit' | 'other';
}> {
  return WEEKLY_SCHEDULE_TEMPLATE.map((tpl, idx) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + tpl.dayOffset);
    start.setHours(tpl.startHour, tpl.startMinute, 0, 0);

    const end = new Date(start.getTime() + tpl.durationMinutes * 60 * 1000);

    return {
      id: `ev-${start.toISOString()}-${idx}`,
      title: tpl.title,
      start,
      end,
      location: tpl.location,
      description: tpl.description,
      category: tpl.category,
    };
  });
}

export const SAMPLE_ICS_DATA = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Marges Universitaire//FR
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:sample-num1-cm@marges
DTSTART:20261013T090000
DTEND:20261013T101500
SUMMARY:CM - ECUE Analyse numérique 1 G01
DESCRIPTION:CM Analyse numérique
END:VEVENT
BEGIN:VEVENT
UID:sample-edo-td@marges
DTSTART:20261013T101500
DTEND:20261013T121500
SUMMARY:TD - MA3 EDO & systèmes dynamiques G02/2
LOCATION:Salle E309
DESCRIPTION:10:15 (08:15 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-alg-cm@marges
DTSTART:20261013T134500
DTEND:20261013T144500
SUMMARY:CM - ECUE Algèbre linéaire numérique &...
DESCRIPTION:Algèbre linéaire et calcul matriciel
END:VEVENT
BEGIN:VEVENT
UID:sample-alg-td@marges
DTSTART:20261013T144500
DTEND:20261013T170000
SUMMARY:TD - ECUE Algèbre linéaire numérique & matlab G02
LOCATION:Salle B214 (Salle informatique)
DESCRIPTION:14:45 (12:45 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-num2-td@marges
DTSTART:20261014T133000
DTEND:20261014T153000
SUMMARY:TD - ECUE Analyse numérique 1 G02
LOCATION:Salle E109
DESCRIPTION:13:30 (11:30 GMT)
END:VEVENT
BEGIN:VEVENT
UID:sample-hist-cm@marges
DTSTART:20261014T154500
DTEND:20261014T174500
SUMMARY:CM - MA3 Histoire des sciences et de l'industrie
LOCATION:Salle A231 (Amphi Gradiné)
DESCRIPTION:15:45 (13:45 GMT)
END:VEVENT
END:VCALENDAR`;

/**
 * Convertit un flux RSS/Atom contenant des événements vers le format iCalendar standard (VCalendar).
 */
export function convertRssToIcs(xmlText: string): string {
  if (typeof DOMParser === 'undefined') return xmlText;
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item, entry'));
    if (!items.length) return xmlText;

    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Marges RSS Adapter//FR\r\nCALSCALE:GREGORIAN\r\n";
    items.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'Événement';
      const desc = item.querySelector('description, summary, content')?.textContent || '';
      const dateStr = item.querySelector('pubDate, date, updated, published')?.textContent;
      const d = dateStr ? new Date(dateStr) : new Date();
      const end = new Date(d.getTime() + 90 * 60 * 1000); // 1h30 par défaut

      const toIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      ics += "BEGIN:VEVENT\r\n";
      ics += `UID:rss-${idx}-${d.getTime()}@marges\r\n`;
      ics += `DTSTART:${toIcsDate(d)}\r\n`;
      ics += `DTEND:${toIcsDate(end)}\r\n`;
      ics += `SUMMARY:${title.replace(/\r?\n/g, ' ')}\r\n`;
      if (desc) ics += `DESCRIPTION:${desc.slice(0, 200).replace(/\r?\n/g, ' ')}\r\n`;
      ics += "END:VEVENT\r\n";
    });
    ics += "END:VCALENDAR\r\n";
    return ics;
  } catch {
    return xmlText;
  }
}

/**
 * Télécharge un calendrier distant depuis une URL (iCal, Webcal, ou RSS) avec gestion robuste CORS et proxys de secours.
 */
export async function fetchCalendarFromUrl(rawUrl: string): Promise<string> {
  let url = rawUrl.trim();
  if (!url) throw new Error('URL de calendrier manquante.');

  // Normalisation des protocoles Webcal et Feed
  if (url.startsWith('webcal://')) {
    url = 'https://' + url.slice('webcal://'.length);
  } else if (url.startsWith('feed://')) {
    url = 'https://' + url.slice('feed://'.length);
  }

  // 1. Tenter un fetch direct (navigateur -> serveur universitaire si CORS autorisé)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/calendar, application/rss+xml, application/atom+xml, text/plain, */*',
      },
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT'))) {
        return text;
      }
      if (text && (text.includes('<rss') || text.includes('<feed'))) {
        return convertRssToIcs(text);
      }
    }
  } catch (directErr) {
    console.warn('[Calendar Sync] Fetch direct indisponible (CORS ou réseau), repli...', directErr);
  }

  // 2. Si on est sur le serveur local Node (dev/preview), utiliser l'endpoint proxy interne
  try {
    const localProxyUrl = `/api/calendar/proxy?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(localProxyUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT'))) {
        return text;
      }
      if (text && (text.includes('<rss') || text.includes('<feed'))) {
        return convertRssToIcs(text);
      }
    }
  } catch {}

  // 3. Fallback proxy public (CORS) pour GitHub Pages ou domaines universitaires stricts
  const publicProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of publicProxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('BEGIN:VCALENDAR') || text.includes('BEGIN:VEVENT'))) {
          return text;
        }
        if (text && (text.includes('<rss') || text.includes('<feed'))) {
          return convertRssToIcs(text);
        }
      }
    } catch {}
  }

  throw new Error(
    "Impossible de récupérer le flux directement en ligne. Votre université restreint probablement les requêtes externes (sécurité ENT ou CORS). Conseil : téléchargez le fichier .ics depuis votre ENT et déposez-le dans le champ d'importation de fichier."
  );
}

/**
 * Décompose un contenu iCalendar (.ics) en événements hebdomadaires récurrents
 * pour insertion dans la table Supabase `schedule_events`.
 */
export function parseIcsToScheduleEvents(
  icsContent: string
): Array<Omit<DbScheduleEvent, 'id' | 'user_id' | 'created_at'>> {
  if (!icsContent || !icsContent.includes('BEGIN:VCALENDAR')) return [];

  const results: Array<Omit<DbScheduleEvent, 'id' | 'user_id' | 'created_at'>> = [];
  const seen = new Set<string>();

  try {
    const icalLib = (ICAL as any).default || ICAL;
    if (!icalLib || !icalLib.parse) return [];

    const jcal = icalLib.parse(icsContent);
    const comp = new icalLib.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const ev = new icalLib.Event(vevent);
      const title = (ev.summary || 'Cours').trim();
      if (!title) continue;

      const location = ev.location ? ev.location.trim() : undefined;
      const notes = ev.description ? ev.description.trim() : undefined;

      const jsDate = ev.startDate.toJSDate();
      const jsDay = jsDate.getDay(); // 0 = Dimanche, 1 = Lundi, 6 = Samedi
      const day_of_week = jsDay === 0 ? 7 : jsDay;

      let sH = ev.startDate.hour;
      let sM = ev.startDate.minute;
      let eH = ev.endDate ? ev.endDate.hour : sH + 1;
      let eM = ev.endDate ? ev.endDate.minute : sM;

      if (typeof sH !== 'number' || isNaN(sH)) {
        sH = jsDate.getHours();
        sM = jsDate.getMinutes();
        const endJs = ev.endDate ? ev.endDate.toJSDate() : new Date(jsDate.getTime() + 60 * 60 * 1000);
        eH = endJs.getHours();
        eM = endJs.getMinutes();
      }

      const start_time = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
      const end_time = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`;

      const dedupeKey = `${day_of_week}|${start_time}|${end_time}|${title.toLowerCase()}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        results.push({
          title,
          day_of_week,
          start_time,
          end_time,
          location: location || undefined,
          notes: notes || undefined,
        });
      }
    }
  } catch (err) {
    console.warn('[Calendar Parse] Erreur décomposition ICS:', err);
  }

  // Trier par jour et heure
  results.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  return results;
}

/**
 * Synchronisation automatique bidirectionnelle de l'emploi du temps entre le stockage local
 * et le Cloud Supabase (permettant un affichage identique sur PC, mobile et tablette).
 */
export async function syncTimetableState(options?: {
  forcePushLocal?: boolean;
}): Promise<{
  synced: boolean;
  source: 'local' | 'cloud' | 'none';
  icsContent?: string;
  icsUrl?: string;
  eventsCount?: number;
}> {
  if (typeof window === 'undefined') {
    return { synced: false, source: 'none' };
  }

  const { isConfigured } = getSupabaseCredentials();
  const localIcs = loadPersistent(STORAGE_KEYS.TIMETABLE_ICS);
  const localUrl = loadPersistent(STORAGE_KEYS.TIMETABLE_URL);

  if (!isConfigured) {
    return {
      synced: false,
      source: 'local',
      icsContent: localIcs || undefined,
      icsUrl: localUrl || undefined,
    };
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    return {
      synced: false,
      source: 'local',
      icsContent: localIcs || undefined,
      icsUrl: localUrl || undefined,
    };
  }

  try {
    const cloud = await fetchTimetableFromSupabase();

    // Cas 1 : L'utilisateur a déjà son emploi du temps sur son PC (localIcs ou localUrl),
    // mais le Cloud Supabase est encore vide -> PUSH AUTOMATIQUE VERS SUPABASE
    if ((localIcs || localUrl) && (!cloud?.icsContent && !cloud?.icsUrl || options?.forcePushLocal)) {
      console.log('[Marges Sync] Synchronisation du calendrier local vers Supabase Cloud...');
      await syncTimetableToSupabase({
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      });

      if (localIcs) {
        const existing = await fetchUserScheduleEvents().catch(() => []);
        if (existing.length === 0) {
          const parsed = parseIcsToScheduleEvents(localIcs);
          if (parsed.length > 0) {
            await createBatchUserScheduleEvents(parsed).catch(console.warn);
          }
        }
      }

      return {
        synced: true,
        source: 'local',
        icsContent: localIcs || undefined,
        icsUrl: localUrl || undefined,
      };
    }

    // Cas 2 : L'appareil actuel (ex: Smartphone mobile) n'a pas encore le fichier localement,
    // mais le Cloud Supabase le possède déjà -> PULL AUTOMATIQUE DEPUIS SUPABASE
    if (cloud && (cloud.icsContent || cloud.icsUrl)) {
      let activeIcs = localIcs;
      let activeUrl = localUrl;

      if (cloud.icsContent && cloud.icsContent !== localIcs) {
        savePersistent(STORAGE_KEYS.TIMETABLE_ICS, cloud.icsContent);
        activeIcs = cloud.icsContent;
      }
      if (cloud.icsUrl && cloud.icsUrl !== localUrl) {
        savePersistent(STORAGE_KEYS.TIMETABLE_URL, cloud.icsUrl);
        activeUrl = cloud.icsUrl;
      }

      // Si l'utilisateur a configuré une URL mais qu'aucun contenu ICS n'est en cache, on le télécharge
      if (!activeIcs && activeUrl) {
        try {
          const fetched = await fetchCalendarFromUrl(activeUrl);
          if (fetched) {
            savePersistent(STORAGE_KEYS.TIMETABLE_ICS, fetched);
            activeIcs = fetched;
            await syncTimetableToSupabase({ icsContent: fetched }).catch(() => {});
          }
        } catch (fetchErr) {
          console.warn('[Marges Sync] Impossible de télécharger l’URL de calendrier:', fetchErr);
        }
      }

      return {
        synced: true,
        source: 'cloud',
        icsContent: activeIcs || undefined,
        icsUrl: activeUrl || undefined,
      };
    }
  } catch (syncErr) {
    console.warn('[Marges Sync] Erreur lors de la synchronisation Supabase:', syncErr);
  }

  return {
    synced: false,
    source: 'local',
    icsContent: localIcs || undefined,
    icsUrl: localUrl || undefined,
  };
}

