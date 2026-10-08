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
export type JournalReadResult = { journal: Journal; error?: string };
export const STORAGE_KEY = 'cyclewise-journal-v1';
export const blankJournal = (): Journal => ({ entries: [], reminders: [], preferences: {}, sample: false });
const isRecordValue = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isDateOnly = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export function readJournalResult(): JournalReadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { journal: blankJournal() };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid journal format');
    const data = parsed as Partial<Journal>;
    if (!Array.isArray(data.entries) || !Array.isArray(data.reminders)) throw new Error('Invalid journal structure');
    const validEntry = (entry: unknown) => isRecordValue(entry) && typeof entry.id === 'string' && isDateOnly(entry.date) && Array.isArray(entry.symptoms) && entry.symptoms.every(symptom => isRecordValue(symptom) && typeof symptom.name === 'string' && Number.isInteger(symptom.severity) && Number(symptom.severity) >= 1 && Number(symptom.severity) <= 3) && ['periodStart', 'periodEnd'].every(key => entry[key] == null || isDateOnly(entry[key]));
    const validReminder = (reminder: unknown) => isRecordValue(reminder) && typeof reminder.id === 'string' && typeof reminder.title === 'string' && !!reminder.title.trim() && isDateOnly(reminder.dueDate) && (reminder.type === 'appointment' || reminder.type === 'medication') && typeof reminder.done === 'boolean';
    if (!data.entries.every(validEntry) || !data.reminders.every(validReminder) || (data.preferences != null && !isRecordValue(data.preferences))) throw new Error('Invalid journal records');
    return { journal: { entries: data.entries, reminders: data.reminders, preferences: data.preferences || {}, sample: !!data.sample } };
  } catch {
    return { journal: blankJournal(), error: 'The saved journal could not be read. It has not been overwritten. Retry, or use Privacy & data to manage local records.' };
  }
}
export function readJournal(): Journal { return readJournalResult().journal; }
export function saveJournal(journal: Journal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
}
export const bmiFor = (entry?: Entry) => entry?.weightKg && entry.heightCm ? entry.weightKg / ((entry.heightCm / 100) ** 2) : undefined;
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);

export function analyzeJournal(entries: Entry[]): string[] {
  const insights: string[] = [];
  const starts = [...new Set(entries.flatMap(entry => entry.periodStart ? [entry.periodStart] : []))].sort();
  const intervals = starts.slice(1).map((date, index) => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${starts[index]}T12:00:00`).getTime()) / 86400000));

  if (intervals.length >= 2) {
    const average = Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length);
    const min = Math.min(...intervals);
    const max = Math.max(...intervals);
    insights.push(`Across ${intervals.length} recorded intervals, the average gap between period starts is ${average} days (range ${min}–${max} days). This describes past dates only; it does not predict a future cycle.`);
  }

  const symptomCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const symptom of new Set(entry.symptoms.map(item => item.name))) {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
    }
  }
  const repeatedSymptoms = [...symptomCounts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
  if (repeatedSymptoms.length) {
    const [name, count] = repeatedSymptoms[0];
    insights.push(`${name} was recorded in ${count} separate notes. This is a count of what you logged, not an explanation of why it happened.`);
  }

  const sleepEntries = entries.flatMap(entry => entry.sleepHours == null ? [] : [entry.sleepHours]);
  if (sleepEntries.length >= 3) {
    const average = (sleepEntries.reduce((sum, hours) => sum + hours, 0) / sleepEntries.length).toFixed(1);
    insights.push(`You recorded sleep on ${sleepEntries.length} days, averaging ${average} hours on those days. Unlogged days are not included.`);
  }

  return insights;
}

export function replyToHealthQuestion(question: string): string {
  const text = question.trim().toLowerCase();

  if (!text) return 'Please type a question first. You can ask about PCOS, cycle changes, symptoms, fertility, treatment questions, tracking, or privacy.';
  if (/^(help|why|what|how|it|this|that)[?.!]*$/.test(text)) {
    return 'I’m not sure what you mean yet. Could you add a little detail? For example, are you asking about a symptom, a cycle change, fertility, treatment, tracking, or privacy?';
  }

  if (/severe pain|worst pain|faint|pass(?:ed)? out|very heavy bleeding|can't breathe|cannot breathe|emergency/.test(text)) {
    return 'If you may be experiencing a medical emergency, seek urgent medical care now or contact your local emergency service. I can’t assess urgency or provide emergency care through this chat.';
  }
  if (/diagnos|do i have|could i have|is this pcos/.test(text)) {
    return 'A symptom or journal pattern alone can’t confirm PCOS. A clinician can review your cycle history, symptoms, and any appropriate tests, and consider other possible causes. I can help you organize questions for that visit.';
  }
  if (/fertil|pregnan|conceiv|ovulat/.test(text)) {
    return 'PCOS can make ovulation less predictable for some people, but experiences vary and many people with PCOS do become pregnant. A clinician can discuss your goals and options with you; this chat can’t estimate your personal fertility.';
  }
  if (/medicine|medication|metformin|birth control|contracept|supplement|treatment|take .* pill|stop .* pill/.test(text)) {
    return 'PCOS care is individualized, and medicines or supplements can have risks and interactions. Don’t start, stop, or change a prescribed treatment based on this chat; ask your clinician or pharmacist what is appropriate for you.';
  }
  if (/period|cycle|missed|irregular|late/.test(text)) {
    return 'Cycle timing can vary for many reasons. Your log can help you bring dates and changes to a clinician, but it can’t identify a cause or predict what will happen next. If a period is missed and pregnancy is possible, consider a pregnancy test and contact a clinician with concerns.';
  }
  if (/symptom|acne|hair growth|hair loss|cramp|pain|bloat|fatigue|weight/.test(text)) {
    return 'Symptoms such as acne, changes in hair growth, fatigue, or weight can have many causes and don’t confirm PCOS on their own. You can note when they happen and how they affect you, then discuss persistent or concerning changes with a clinician.';
  }
  if (/track|journal|pattern|log|record/.test(text)) {
    return 'A useful log can be simple: dates, symptoms you want to remember, and any context that matters to you. Missing days are okay. Cyclewise summarizes only what you entered; those summaries show records, not causes or diagnoses.';
  }
  if (/privacy|private|stored|save|server|who can see/.test(text)) {
    return 'Your journal is stored in this browser on this device. Chat messages are handled locally and are not saved to your journal or sent to a server. Anyone with access to this browser profile may still be able to see local data.';
  }
  if (/what is pcos|about pcos|explain pcos|pcos mean|\bpcos\b/.test(text)) {
    return 'PCOS (polycystic ovary syndrome) is a hormone-related condition that can affect ovulation and may involve signs of higher androgen levels. It varies from person to person. A clinician assesses symptoms and, when appropriate, tests while considering other causes; the name alone doesn’t mean ovarian cysts are always present.';
  }
  return 'I’m not sure which part you mean. I can share general information about PCOS, cycle changes, symptoms, fertility, treatment questions, tracking, and privacy. Please rephrase your question or choose one of those topics. I can’t diagnose or recommend treatment.';
}

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
