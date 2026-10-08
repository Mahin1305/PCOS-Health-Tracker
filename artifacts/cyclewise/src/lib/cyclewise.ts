export type Symptom = { name: string; severity: number };
export type Entry = {
  id: string;
  date: string;
  periodStart?: string;
  periodEnd?: string;
  flowLevel?: string;
  symptoms: Symptom[];
  weightKg?: number;
  heightCm?: number;
  dietNotes?: string;
  exerciseMinutes?: number;
  sleepHours?: number;
  stressLevel?: number;
  mood?: string;
  notes?: string;
};
export type Reminder = {
  id: string;
  type: 'medication' | 'appointment';
  title: string;
  dueDate: string;
  notes?: string;
  done: boolean;
};
export type Journal = { entries: Entry[]; reminders: Reminder[]; preferences: { usualCycleDays?: number }; sample?: boolean };
export const STORAGE_KEY = 'cyclewise-journal-v1';
export const blankJournal = (): Journal => ({ entries: [], reminders: [], preferences: {}, sample: false });
export function readJournal(): Journal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankJournal();
    const parsed = JSON.parse(raw) as Partial<Journal>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [], reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [], preferences: parsed.preferences || {}, sample: !!parsed.sample };
  } catch {
    return blankJournal();
  }
}
export function saveJournal(journal: Journal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
}
export const bmiFor = (entry?: Entry) => entry?.weightKg && entry.heightCm ? entry.weightKg / ((entry.heightCm / 100) ** 2) : undefined;
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);

export function makeDemoJournal(): Journal {
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const entries: Entry[] = [
    { id: 'demo-1', date: daysAgo(4), periodStart: daysAgo(4), flowLevel: 'Medium', symptoms: [{ name: 'Cramps', severity: 2 }, { name: 'Fatigue', severity: 1 }], weightKg: 71.4, heightCm: 165, sleepHours: 7.2, exerciseMinutes: 25, stressLevel: 2, mood: 'Steady', notes: 'A quiet walk helped me reset.' },
    { id: 'demo-2', date: daysAgo(13), symptoms: [{ name: 'Bloating', severity: 1 }], weightKg: 71.8, heightCm: 165, sleepHours: 6.8, exerciseMinutes: 35, stressLevel: 3, mood: 'Hopeful', dietNotes: 'More regular lunches this week.' },
    { id: 'demo-3', date: daysAgo(31), periodStart: daysAgo(31), periodEnd: daysAgo(27), flowLevel: 'Heavy', symptoms: [{ name: 'Cramps', severity: 3 }, { name: 'Headache', severity: 2 }], weightKg: 72.1, heightCm: 165, sleepHours: 6.4, exerciseMinutes: 15, stressLevel: 4, mood: 'Low', notes: 'Noted headache on day one.' },
    { id: 'demo-4', date: daysAgo(43), symptoms: [{ name: 'Acne', severity: 1 }], weightKg: 71.9, heightCm: 165, sleepHours: 7.5, exerciseMinutes: 40, stressLevel: 2, mood: 'Good' },
    { id: 'demo-5', date: daysAgo(61), periodStart: daysAgo(61), periodEnd: daysAgo(57), flowLevel: 'Medium', symptoms: [{ name: 'Cramps', severity: 2 }], weightKg: 72.5, heightCm: 165, sleepHours: 7, exerciseMinutes: 30, stressLevel: 3, mood: 'Steady' },
    { id: 'demo-6', date: daysAgo(75), symptoms: [{ name: 'Bloating', severity: 2 }], weightKg: 72.2, heightCm: 165, sleepHours: 6.6, exerciseMinutes: 20, stressLevel: 3, mood: 'Steady' },
  ];
  return { entries, reminders: [{ id: 'demo-rem-1', type: 'appointment', title: 'Annual check-in', dueDate: daysAgo(-7), notes: 'Bring cycle notes', done: false }], preferences: { usualCycleDays: 28 }, sample: true };
}
