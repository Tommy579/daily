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
