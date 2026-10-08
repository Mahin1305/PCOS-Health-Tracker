import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Activity, AlertCircle, ArrowDownToLine, ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, CircleHelp, Clock3, FileText, Heart, Leaf, LockKeyhole, Plus, Printer, Settings2, ShieldCheck, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bmiFor, dateLabel, makeDemoJournal, readJournal, saveJournal, type Entry, type Journal, type Reminder, type Symptom } from '@/lib/cyclewise';

const navigation = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/log', label: 'Daily log', icon: Plus },
  { href: '/trends', label: 'Patterns', icon: BarChart3 },
  { href: '/reminders', label: 'Reminders', icon: CalendarDays },
  { href: '/report', label: 'Visit summary', icon: FileText },
  { href: '/settings', label: 'Privacy & data', icon: Settings2 },
];
const symptomOptions = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Acne', 'Mood changes', 'Tenderness', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function App() {
  const [journal, setJournal] = useState<Journal>(() => readJournal());
  const [toast, setToast] = useState('');
  const [demo, setDemo] = useState(() => journal.sample === true);
  const [storageError, setStorageError] = useState(false);
  const [location] = useLocation();
  useEffect(() => {
    try { saveJournal(journal); setStorageError(false); }
    catch { setStorageError(true); }
  }, [journal]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const changeJournal = (next: Journal, message?: string) => {
    setJournal({ ...next, sample: false });
    setDemo(false);
    if (message) setToast(message);
  };
  const addEntry = (entry: Entry) => {
    const items = journal.entries.filter(item => item.id !== entry.id);
    changeJournal({ ...journal, entries: [...items, entry].sort((a, b) => b.date.localeCompare(a.date)) }, 'Your note is saved on this device.');
  };
  const addReminder = (reminder: Reminder) => changeJournal({ ...journal, reminders: [...journal.reminders, reminder].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }, 'Reminder added.');
  const toggleReminder = (id: string) => changeJournal({ ...journal, reminders: journal.reminders.map(item => item.id === id ? { ...item, done: !item.done } : item) }, 'Reminder updated.');
  const removeReminder = (id: string) => changeJournal({ ...journal, reminders: journal.reminders.filter(item => item.id !== id) }, 'Reminder removed.');
  const loadDemo = () => { setJournal(makeDemoJournal()); setDemo(true); setToast('Fictional sample loaded. Replace or erase it any time.'); };
  const clearData = () => { setJournal({ entries: [], reminders: [], preferences: {} }); setDemo(false); setToast('Your journal is clear.'); };
  const deleteEntry = (id: string) => changeJournal({ ...journal, entries: journal.entries.filter(entry => entry.id !== id) }, 'Daily note removed.');
  const restore = () => { try { setJournal(readJournal()); setToast('Saved journal reloaded.'); } catch { setStorageError(true); } };

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="brand" data-testid="link-brand">
            <span className="brand-mark"><Activity size={19} /></span><span className="brand-name">cyclewise</span>
          </Link>
          <div className="nav-label">Your journal</div>
          <nav aria-label="Main navigation">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location === href || location.startsWith(`${href}/`);
              return <Link href={href} key={href} className={`nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>;
            })}
          </nav>
          <div className="privacy-note"><strong><LockKeyhole size={14} /> Just for you</strong>Your notes stay in this browser. Nothing is sent to a server.</div>
        </aside>
        <div className="main-area">
          <header className="topbar">
            <div className="topbar-left">A little more in tune, one day at a time</div>
            <div className="topbar-right"><ShieldCheck size={15} /><span>Private on this device</span>{demo && <span className="demo-badge">SAMPLE VIEW</span>}</div>
          </header>
          {storageError && <div className="content" style={{ paddingBottom: 0 }}><div className="data-error" role="alert" data-testid="status-storage-error"><strong>We couldn’t save to this browser.</strong><p style={{ margin: '5px 0 10px', fontSize: 12 }}>Your browser storage may be full or unavailable. Export a backup or try again.</p><button className="btn small" onClick={restore} data-testid="button-retry-storage">Try again</button></div></div>}
          <Switch>
            <Route path="/"><Dashboard journal={journal} onDemo={loadDemo} /></Route>
            <Route path="/log"><LogPage journal={journal} onSave={addEntry} onDelete={deleteEntry} /></Route>
            <Route path="/log/:id">{params => <LogPage journal={journal} onSave={addEntry} onDelete={deleteEntry} entryId={params.id} />}</Route>
            <Route path="/trends"><Trends journal={journal} /></Route>
            <Route path="/reminders"><RemindersPage reminders={journal.reminders} onAdd={addReminder} onToggle={toggleReminder} onRemove={removeReminder} /></Route>
            <Route path="/report"><Report journal={journal} /></Route>
            <Route path="/settings"><SettingsPage journal={journal} onClear={clearData} onDemo={loadDemo} /></Route>
            <Route><NotFound /></Route>
          </Switch>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`${location === href ? 'active' : ''}`} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon /><span>{label === 'Overview' ? 'Home' : label === 'Daily log' ? 'Log' : label === 'Patterns' ? 'Trends' : label === 'Visit summary' ? 'Report' : label === 'Privacy & data' ? 'Privacy' : label}</span></Link>)}
      </nav>
      {toast && <div role="status" className="toast-msg" data-testid="status-toast">{toast}</div>}
    </WouterRouter>
  );
}

function PageHeading({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subhead">{subtitle}</p></div>{children}</div>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty"><Leaf size={22} /><h3>{title}</h3><p>{body}</p>{action}</div>;
}
function NonDiagnosticNotice() { return <div className="notice" data-testid="notice-nondiagnostic"><CircleHelp size={17} /><div><strong>A note, not a diagnosis.</strong> Cyclewise helps you notice and organize your own records. It can’t tell you what’s causing a change or replace care from a clinician.</div></div>; }
function getCycleStarts(entries: Entry[]) {
  const unique = new Map<string, Entry>();
  entries.filter(e => e.periodStart).forEach(entry => unique.set(entry.periodStart as string, entry));
  return [...unique.entries()].map(([date, entry]) => ({ date, entry })).sort((a, b) => a.date.localeCompare(b.date));
}
function cycleLengths(entries: Entry[]) {
  const starts = getCycleStarts(entries);
  return starts.slice(1).map((item, i) => ({ start: item.date, days: Math.round((new Date(`${item.date}T12:00:00`).getTime() - new Date(`${starts[i].date}T12:00:00`).getTime()) / 86400000) }));
}
function patternNotes(entries: Entry[]) {
  const notes: string[] = [];
  const lengths = cycleLengths(entries);
  if (lengths.length >= 2) {
    const range = Math.max(...lengths.map(x => x.days)) - Math.min(...lengths.map(x => x.days));
    if (range >= 9) notes.push(`Your recorded cycle lengths span ${range} days. If that feels important to you, it may be useful to bring these dates to a clinician.`);
  }
  const latest = lengths.at(-1);
  if (latest && latest.days > 45) notes.push(`There are ${latest.days} days between the two latest recorded period starts. A longer gap can be worth discussing with a clinician, especially if it’s unusual for you.`);
  const weights = entries.filter(e => e.weightKg).sort((a, b) => a.date.localeCompare(b.date));
  if (weights.length >= 2) {
    const difference = Number((weights.at(-1)!.weightKg! - weights[0].weightKg!).toFixed(1));
    if (Math.abs(difference) >= 4) notes.push(`Your recorded weight differs by ${Math.abs(difference)} kg across this log. Measurements can fluctuate; consider asking a clinician how to interpret this in context.`);
  }
  if (entries.length >= 4) {
    const highStress = entries.filter(e => (e.stressLevel || 0) >= 4);
    const sleepLogged = entries.filter(e => e.sleepHours);
    if (highStress.length >= 2 && sleepLogged.length >= 3) notes.push(`You logged higher stress on ${highStress.length} days. Sleep and stress notes can add context to a care conversation; this does not show cause and effect.`);
    if (sleepLogged.length >= 3) {
      const hours = sleepLogged.map(e => e.sleepHours as number);
      notes.push(`Across ${sleepLogged.length} notes, recorded sleep ranged from ${Math.min(...hours)} to ${Math.max(...hours)} hours. These are only the days you chose to log, not a complete picture.`);
    }
    const movementLogged = entries.filter(e => e.exerciseMinutes != null);
    if (movementLogged.length >= 3) notes.push(`Movement was noted on ${movementLogged.length} of ${entries.length} logged days. It may be useful context for you or your clinician; unlogged days don’t mean no movement.`);
  }
  return notes;
}
function Dashboard({ journal, onDemo }: { journal: Journal; onDemo: () => void }) {
  const entries = useMemo(() => [...journal.entries].sort((a, b) => b.date.localeCompare(a.date)), [journal.entries]);
  const starts = getCycleStarts(entries);
  const lengths = cycleLengths(entries);
  const latest = entries[0];
  const latestLength = lengths.at(-1)?.days;
  const bmi = bmiFor(latest);
  const chartData = [...lengths].slice(-6).map((item, index) => ({ name: dateLabel(item.start, { month: 'short' }), length: item.days, label: `Cycle ${index + 1}` }));
  const notes = patternNotes(entries);
  return <main className="content page-enter">
    <PageHeading eyebrow="YOUR PERSONAL JOURNAL" title="Hello, you." subtitle="A gentle place to gather the details that are easy to forget."><Link href="/log" className="btn" data-testid="button-new-daily-log"><Plus size={16} /> Add a daily note</Link></PageHeading>
    <div className="grid stats">
      <div className="card stat-card"><div className="stat-label"><CalendarDays size={14} /> Most recent period start</div><div className="stat-value" data-testid="value-latest-period">{starts.length ? dateLabel(starts.at(-1)!.date, { month: 'short', day: 'numeric' }) : '—'}</div><div className="stat-foot">{starts.length ? 'From a date you recorded' : 'Add a period date when you’re ready'}</div></div>
      <div className="card stat-card"><div className="stat-label"><Activity size={14} /> Latest cycle gap</div><div className="stat-value" data-testid="value-cycle-gap">{latestLength ? `${latestLength} days` : '—'}</div><div className="stat-foot">Between recorded starts</div></div>
      <div className="card stat-card"><div className="stat-label"><Heart size={14} /> Notes gathered</div><div className="stat-value" data-testid="value-entry-count">{entries.length}</div><div className="stat-foot">{entries.length === 1 ? 'one day at a time' : 'days in your journal'}</div></div>
      <div className="card stat-card"><div className="stat-label"><TrendingUp size={14} /> Latest BMI*</div><div className="stat-value" data-testid="value-bmi">{bmi ? bmi.toFixed(1) : '—'}</div><div className="stat-foot">*Optional estimate from your log</div></div>
    </div>
    <div className="grid dashboard-grid">
      <Panel>
        <div className="card-title"><div><div className="eyebrow">OVER TIME</div><h2>Your cycle notes</h2></div><Link href="/trends" className="btn ghost small" data-testid="link-view-patterns">See patterns <ArrowRight size={13} /></Link></div>
        {chartData.length >= 2 ? <div className="chart-box" data-testid="chart-cycle-overview"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}><defs><linearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b8b79" stopOpacity={.24} /><stop offset="100%" stopColor="#4b8b79" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e9e4d8" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#849088', fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#849088', fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2dacc', fontSize: 11 }} /><Area type="monotone" dataKey="length" name="Days between starts" stroke="#39766a" strokeWidth={2.5} fill="url(#cycleFill)" /></AreaChart></ResponsiveContainer></div> : <EmptyState title={entries.length ? 'A little more time will help' : 'Your story starts whenever you’re ready'} body={entries.length ? 'Record at least two period start dates to see the time between them. A few logs are only a starting point.' : 'Add a note or explore the clearly labeled fictional sample to see how Cyclewise works.'} action={!entries.length ? <button className="btn secondary small" onClick={onDemo} data-testid="button-load-demo-dashboard">Explore sample data</button> : undefined} />}
      </Panel>
      <Panel>
        <div className="card-title"><div><div className="eyebrow">A FEW SHORTCUTS</div><h2>Make it yours</h2></div><Sparkles size={18} color="#bd795d" /></div>
        <div className="quick-actions">
          <Link href="/log" className="quick-action" data-testid="link-quick-log"><Plus className="quick-icon" size={17} /><span>Log how today feels</span></Link>
          <Link href="/trends" className="quick-action" data-testid="link-quick-trends"><BarChart3 className="quick-icon" size={17} /><span>Look back at patterns</span></Link>
          <Link href="/reminders" className="quick-action" data-testid="link-quick-reminder"><Clock3 className="quick-icon" size={17} /><span>Plan an appointment</span></Link>
          <Link href="/report" className="quick-action" data-testid="link-quick-report"><FileText className="quick-icon" size={17} /><span>Prepare for a visit</span></Link>
        </div>
        <div className="section-gap notice coral"><ShieldCheck size={16} /><div><strong>Private by design.</strong> Your entries stay in this browser, on this device.</div></div>
      </Panel>
    </div>
    <div className="grid dashboard-grid section-gap">
      <Panel>
        <div className="card-title"><div><div className="eyebrow">RECENT ENTRIES</div><h2>Small details, remembered</h2></div><Link href="/log" className="btn ghost small" data-testid="link-all-logs">All notes <ChevronRight size={14} /></Link></div>
        {entries.length ? entries.slice(0, 3).map(entry => <EntryRow entry={entry} key={entry.id} />) : <EmptyState title="No daily notes yet" body="There’s no right amount to track. Start with whatever feels useful to you." action={<Link href="/log" className="btn secondary small" data-testid="button-create-first-log">Write your first note</Link>} />}
      </Panel>
      <Panel>
        <div className="card-title"><div><div className="eyebrow">THINGS TO DISCUSS</div><h2>Gentle prompts</h2></div><CircleHelp size={17} color="#bd795d" /></div>
        {notes.length ? <div style={{ display: 'grid', gap: 10 }}>{notes.slice(0, 2).map((note, i) => <div className="insight" key={i} data-testid={`insight-pattern-${i}`}><AlertCircle size={16} />{note}</div>)}</div> : <div className="subhead" style={{ background: '#f2eee2', borderRadius: 12, padding: 15 }} data-testid="text-pattern-status">{entries.length < 3 ? 'A few brief notes can’t establish a pattern. Keep only the details that matter to you; there’s no need to fill everything in.' : 'No standout prompts in the dates you’ve recorded so far. That’s not a medical assessment—just what is visible in this journal.'}</div>}
        <div style={{ marginTop: 15 }}><NonDiagnosticNotice /></div>
      </Panel>
    </div>
    {!entries.length && <div className="section-gap" style={{ display: 'flex', justifyContent: 'center' }}><button className="btn ghost small" onClick={onDemo} data-testid="button-load-demo">View fictional sample journal</button></div>}
  </main>;
}
function EntryRow({ entry }: { entry: Entry }) {
  const bmi = bmiFor(entry);
  const items = [entry.flowLevel && `Flow: ${entry.flowLevel.toLowerCase()}`, entry.symptoms.length && `${entry.symptoms.length} symptom${entry.symptoms.length > 1 ? 's' : ''}`, entry.mood].filter(Boolean);
  return <div className="entry-row" data-testid={`row-entry-${entry.id}`}><div className="date-tile"><b>{new Date(`${entry.date}T12:00:00`).getDate()}</b>{dateLabel(entry.date, { month: 'short' })}</div><div className="row-main"><strong>{dateLabel(entry.date)}</strong><span>{items.join(' · ') || 'Personal note'}{bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}</span></div><Link href={`/log/${entry.id}`} className="icon-btn" aria-label="Edit daily note" data-testid={`link-edit-entry-${entry.id}`}><ChevronRight size={17} /></Link></div>;
}

type EntryDraft = { date: string; periodStart: string; periodEnd: string; flowLevel: string; weightKg: string; heightCm: string; dietNotes: string; exerciseMinutes: string; sleepHours: string; stressLevel: string; mood: string; notes: string; severity: string };
const emptyDraft: EntryDraft = { date: today(), periodStart: '', periodEnd: '', flowLevel: '', weightKg: '', heightCm: '', dietNotes: '', exerciseMinutes: '', sleepHours: '', stressLevel: '', mood: '', notes: '', severity: '2' };
function LogPage({ journal, onSave, onDelete, entryId }: { journal: Journal; onSave: (entry: Entry) => void; onDelete: (id: string) => void; entryId?: string }) {
  const [, setLocation] = useLocation();
  const existing = entryId ? journal.entries.find(item => item.id === entryId) : undefined;
  const initial: EntryDraft = existing ? {
    date: existing.date, periodStart: existing.periodStart || '', periodEnd: existing.periodEnd || '', flowLevel: existing.flowLevel || '',
    weightKg: existing.weightKg?.toString() || '', heightCm: existing.heightCm?.toString() || '', dietNotes: existing.dietNotes || '',
    exerciseMinutes: existing.exerciseMinutes?.toString() || '', sleepHours: existing.sleepHours?.toString() || '', stressLevel: existing.stressLevel?.toString() || '',
    mood: existing.mood || '', notes: existing.notes || '', severity: String(existing.symptoms[0]?.severity || 2),
  } : emptyDraft;
  const form = useForm<EntryDraft>({ defaultValues: initial });
  const [symptoms, setSymptoms] = useState<Symptom[]>(existing?.symptoms || []);
  const [error, setError] = useState('');
  const toggleSymptom = (name: string) => setSymptoms(current => current.some(s => s.name === name) ? current.filter(s => s.name !== name) : [...current, { name, severity: Number(form.getValues('severity') || 2) }]);
  const submit = (draft: EntryDraft) => {
    if (!draft.date || !Number.isFinite(new Date(`${draft.date}T12:00:00`).getTime()) || draft.date > today()) { setError('Please choose a valid date, not a future day.'); return; }
    if (draft.periodStart && draft.periodStart > draft.date) { setError('Period start can’t be after the date of this note.'); return; }
    if (draft.periodEnd && (!draft.periodStart || draft.periodEnd < draft.periodStart || draft.periodEnd > draft.date)) { setError('Period end must be on or after its start and no later than this note.'); return; }
    const numeric: [keyof EntryDraft, string, number, number][] = [['weightKg', 'Weight', 20, 350], ['heightCm', 'Height', 80, 250], ['exerciseMinutes', 'Activity', 0, 1440], ['sleepHours', 'Sleep', 0, 24], ['stressLevel', 'Stress', 1, 5]];
    for (const [key, label, min, max] of numeric) {
      const value = draft[key];
      if (value && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) { setError(`${label} needs to be a number between ${min} and ${max}${key === 'weightKg' ? ' kg' : key === 'heightCm' ? ' cm' : ''}.`); return; }
    }
    const severity = Number(draft.severity || 2);
    const entry: Entry = { id: existing?.id || createId(), date: draft.date, periodStart: draft.periodStart || undefined, periodEnd: draft.periodEnd || undefined, flowLevel: draft.flowLevel || undefined, symptoms: symptoms.map(s => ({ ...s, severity })), weightKg: draft.weightKg ? Number(draft.weightKg) : undefined, heightCm: draft.heightCm ? Number(draft.heightCm) : undefined, dietNotes: draft.dietNotes || undefined, exerciseMinutes: draft.exerciseMinutes ? Number(draft.exerciseMinutes) : undefined, sleepHours: draft.sleepHours ? Number(draft.sleepHours) : undefined, stressLevel: draft.stressLevel ? Number(draft.stressLevel) : undefined, mood: draft.mood || undefined, notes: draft.notes || undefined };
    setError('');
    onSave(entry);
    setLocation('/');
  };
  const field = (name: keyof EntryDraft, label: string, type = 'text', hint?: string, props: Record<string, unknown> = {}) => <div className="field"><label htmlFor={`entry-${name}`}>{label}</label><input id={`entry-${name}`} type={type} {...form.register(name)} {...props} data-testid={`input-entry-${name}`} /><span className="field-hint">{hint || 'Optional'}</span></div>;
  if (entryId && !existing) return <main className="content page-enter"><PageHeading eyebrow="DAILY JOURNAL" title="Note not found" subtitle="It may have been erased from this browser." /><div className="empty"><Link href="/log" className="btn" data-testid="link-back-to-log">Back to your notes</Link></div></main>;
  return <main className="content page-enter">
    <PageHeading eyebrow="A DAILY NOTE" title={existing ? 'Edit your note' : 'What would you like to remember?'} subtitle="A little or a lot—there’s no checklist to complete." />
    <div className="grid dashboard-grid">
      <Panel>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} noValidate>
          <div className="form-grid">
            {field('date', 'Date of note', 'date')}
            <div className="field"><label htmlFor="entry-flowLevel">Flow</label><select id="entry-flowLevel" {...form.register('flowLevel')} data-testid="input-entry-flow"><option value="">Not recorded</option><option>Spotting</option><option>Light</option><option>Medium</option><option>Heavy</option></select><span className="field-hint">Only if relevant today</span></div>
            {field('periodStart', 'Period start date', 'date', 'Use the same date across days of a period if you prefer.')}
            {field('periodEnd', 'Period end date', 'date', 'Optional')}
            <div className="field full"><label>Symptoms you noticed</label><div className="symptom-picker">{symptomOptions.map(name => <button type="button" className={`symptom-chip${symptoms.some(s => s.name === name) ? ' selected' : ''}`} onClick={() => toggleSymptom(name)} key={name} aria-pressed={symptoms.some(s => s.name === name)} data-testid={`button-symptom-${name.toLowerCase().replaceAll(' ', '-')}`}>{name}</button>)}</div></div>
            <div className="field"><label htmlFor="entry-severity">Symptom intensity</label><select id="entry-severity" {...form.register('severity')} data-testid="input-entry-severity"><option value="1">A little</option><option value="2">Noticeable</option><option value="3">A lot</option></select><span className="field-hint">Applied to selected symptoms</span></div>
            {field('weightKg', 'Weight (kg)', 'number', 'Optional—no goals or targets here.', { min: 20, max: 350, step: '0.1', inputMode: 'decimal' })}
            {field('heightCm', 'Height (cm)', 'number', 'Used only for a BMI estimate.', { min: 80, max: 250, step: '0.1', inputMode: 'decimal' })}
            {field('sleepHours', 'Sleep (hours)', 'number', 'Optional', { min: 0, max: 24, step: '0.1' })}
            {field('exerciseMinutes', 'Movement (minutes)', 'number', 'Any movement you want to remember.', { min: 0, max: 1440, step: '1' })}
            <div className="field"><label htmlFor="entry-stressLevel">Stress, as you experienced it</label><select id="entry-stressLevel" {...form.register('stressLevel')} data-testid="input-entry-stress"><option value="">Not recorded</option><option value="1">1 · Very low</option><option value="2">2 · Low</option><option value="3">3 · In the middle</option><option value="4">4 · High</option><option value="5">5 · Very high</option></select><span className="field-hint">Your own sense of the day</span></div>
            <div className="field"><label htmlFor="entry-mood">Mood</label><select id="entry-mood" {...form.register('mood')} data-testid="input-entry-mood"><option value="">Not recorded</option><option>Steady</option><option>Good</option><option>Hopeful</option><option>Low</option><option>Worried</option><option>Mixed</option><option>Other</option></select><span className="field-hint">Use your own words in notes, too</span></div>
            <div className="field full"><label htmlFor="entry-dietNotes">Food notes</label><textarea id="entry-dietNotes" {...form.register('dietNotes')} placeholder="Anything about meals or appetite you’d like to remember?" data-testid="input-entry-diet-notes" /></div>
            <div className="field full"><label htmlFor="entry-notes">Anything else?</label><textarea id="entry-notes" {...form.register('notes')} placeholder="Keep a detail for yourself or a future appointment." data-testid="input-entry-notes" /></div>
          </div>
          {error && <div className="notice coral" role="alert" style={{ marginTop: 16 }} data-testid="status-entry-error"><AlertCircle size={16} />{error}</div>}
          <div className="form-actions">{existing && <button className="btn danger" type="button" style={{ marginRight: 'auto' }} onClick={() => { if (window.confirm('Delete this daily note? This cannot be undone.')) { onDelete(existing.id); setLocation('/'); } }} data-testid="button-delete-entry"><Trash2 size={14} /> Delete note</button>}<Link href="/" className="btn ghost" data-testid="button-cancel-entry">Cancel</Link><button className="btn" type="submit" data-testid="button-save-entry"><Check size={15} /> Save note</button></div>
        </form></Form>
      </Panel>
      <div style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
        <div className="privacy-box"><div style={{ display: 'flex', gap: 9, alignItems: 'center', fontWeight: 700, fontSize: 13 }}><LockKeyhole size={16} /> Your details stay here</div><p style={{ fontSize: 11, lineHeight: 1.55, margin: '9px 0 0' }}>This journal saves only to local browser storage on this device. No account, network, or server is involved.</p></div>
        <NonDiagnosticNotice />
        <div className="subhead" style={{ padding: 4 }}><strong style={{ color: '#557165' }}>Gentle reminder</strong><br />Sparse or short logs can’t establish a pattern. Skipping any field is always okay.</div>
      </div>
    </div>
  </main>;
}

type TrendTab = 'cycle' | 'body' | 'daily';
function Trends({ journal }: { journal: Journal }) {
  const [tab, setTab] = useState<TrendTab>('cycle');
  const entries = useMemo(() => [...journal.entries].sort((a, b) => a.date.localeCompare(b.date)), [journal.entries]);
  const cycleData = cycleLengths(entries).map((item, i) => ({ date: dateLabel(item.start, { month: 'short', day: 'numeric' }), cycle: item.days, index: i }));
  const bodyData = entries.filter(e => e.weightKg || bmiFor(e)).map(e => ({ date: dateLabel(e.date, { month: 'short', day: 'numeric' }), weight: e.weightKg, bmi: bmiFor(e) ? Number(bmiFor(e)!.toFixed(1)) : undefined }));
  const dailyData = entries.filter(e => e.sleepHours || e.exerciseMinutes || e.stressLevel).map(e => ({ date: dateLabel(e.date, { month: 'short', day: 'numeric' }), sleep: e.sleepHours, movement: e.exerciseMinutes, stress: e.stressLevel }));
  const prompts = patternNotes(entries);
  return <main className="content page-enter">
    <PageHeading eyebrow="LOOKING BACK, GENTLY" title="Your patterns, over time" subtitle="Charts are a way to organize your notes—not an explanation of what they mean." />
    <NonDiagnosticNotice />
    <div className="tabs section-gap" role="tablist" aria-label="Trend categories">
      {([{ id: 'cycle', label: 'Cycle timing' }, { id: 'body', label: 'Weight & BMI' }, { id: 'daily', label: 'Sleep, movement & stress' }] as const).map(item => <button className={`tab${tab === item.id ? ' active' : ''}`} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} key={item.id} data-testid={`tab-trends-${item.id}`}>{item.label}</button>)}
    </div>
    {tab === 'cycle' && <Panel><div className="card-title"><div><div className="eyebrow">DAYS BETWEEN PERIOD STARTS</div><h2>Cycle timing</h2></div><span className="tag">{cycleData.length} intervals</span></div>{cycleData.length >= 2 ? <div className="metric-chart" data-testid="chart-cycle-trends"><ResponsiveContainer width="100%" height="100%"><LineChart data={cycleData} margin={{ top: 12, right: 20, bottom: 0, left: -12 }}><CartesianGrid stroke="#e8e3d7" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2dacc', fontSize: 11 }} /><Line type="monotone" dataKey="cycle" name="Days between starts" stroke="#39766a" strokeWidth={2.5} dot={{ r: 4, fill: '#c87c5f', stroke: '#fbf9f3', strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="Not enough dates to chart yet" body="A cycle interval needs two period start dates. Even with more dates, keep in mind that a sparse journal can’t establish a personal pattern." action={<Link href="/log" className="btn secondary small" data-testid="button-log-period-trends">Add a period date</Link>} />}</Panel>}
    {tab === 'body' && <div className="grid metric-grid"><Panel><div className="card-title"><div><div className="eyebrow">OPTIONAL MEASUREMENTS</div><h2>Weight over time</h2></div></div>{bodyData.length >= 2 ? <div className="metric-chart" data-testid="chart-weight"><ResponsiveContainer width="100%" height="100%"><LineChart data={bodyData}><CartesianGrid stroke="#e8e3d7" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2dacc', fontSize: 11 }} /><Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#c37b5f" strokeWidth={2.5} dot={{ r: 3 }} connectNulls /></LineChart></ResponsiveContainer></div> : <EmptyState title="No measurement trend yet" body="Add optional measurements on a few different days to see them over time." />}</Panel><Panel><div className="card-title"><div><div className="eyebrow">A ROUGH CALCULATION</div><h2>BMI estimate</h2></div></div>{bodyData.filter(d => d.bmi).length >= 2 ? <div className="metric-chart" data-testid="chart-bmi"><ResponsiveContainer width="100%" height="100%"><LineChart data={bodyData}><CartesianGrid stroke="#e8e3d7" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2dacc', fontSize: 11 }} /><Line type="monotone" dataKey="bmi" name="BMI estimate" stroke="#39766a" strokeWidth={2.5} dot={{ r: 3 }} connectNulls /></LineChart></ResponsiveContainer></div> : <EmptyState title="BMI needs a few paired entries" body="An estimate appears only when the same note includes both height and weight. BMI is a limited measure and doesn’t describe an individual’s health." />}</Panel><div className="notice coral" style={{ gridColumn: '1/-1' }}><CircleHelp size={17} /><span>Measurements are optional. Weight and BMI changes can have many contexts and should not be treated as targets or judgments.</span></div></div>}
    {tab === 'daily' && <Panel><div className="card-title"><div><div className="eyebrow">NOT EVERY DAY LOOKS THE SAME</div><h2>Sleep, movement & stress</h2></div></div>{dailyData.length >= 2 ? <div className="metric-chart" data-testid="chart-daily-patterns"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData} margin={{ left: -10, right: 10 }}><CartesianGrid stroke="#e8e3d7" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#819087', fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2dacc', fontSize: 11 }} /><Line yAxisId="left" type="monotone" dataKey="sleep" name="Sleep (hours)" stroke="#39766a" strokeWidth={2.3} dot={{ r: 3 }} connectNulls /><Line yAxisId="left" type="monotone" dataKey="stress" name="Stress (1–5)" stroke="#c37b5f" strokeWidth={2} dot={{ r: 3 }} connectNulls /><Line yAxisId="right" type="monotone" dataKey="movement" name="Movement (minutes)" stroke="#879e70" strokeWidth={2} dot={{ r: 3 }} connectNulls /></LineChart></ResponsiveContainer></div> : <EmptyState title="A few more day notes may help" body="Add sleep, movement, or stress notes on different days. You can leave any of those fields blank." action={<Link href="/log" className="btn secondary small" data-testid="button-add-daily-trends">Add a daily note</Link>} />}</Panel>}
    <div className="grid dashboard-grid section-gap"><Panel><div className="card-title"><div><div className="eyebrow">PROMPTS, NOT CONCLUSIONS</div><h2>Bring the record, ask your questions</h2></div><FileText size={18} color="#b87558" /></div>{prompts.length ? <div style={{ display: 'grid', gap: 10 }}>{prompts.map((text, i) => <div className="insight" key={i} data-testid={`trend-prompt-${i}`}><AlertCircle size={16} />{text}</div>)}</div> : <p className="subhead" data-testid="text-no-prompts">{entries.length < 3 ? 'Short or sparse notes can’t establish patterns. As you add information, it may become easier to see what you want to ask about.' : 'No specific prompts emerge from these entries. That is not evidence for or against anything; your clinician can help interpret your records.'}</p>}</Panel><Panel><h3>Need the details together?</h3><p className="subhead" style={{ marginBottom: 15 }}>Make a clean, clinician-facing summary from the notes you choose to keep.</p><Link href="/report" className="btn secondary" data-testid="link-trends-to-report"><FileText size={15} /> Prepare visit summary</Link></Panel></div>
  </main>;
}

type ReminderDraft = { type: Reminder['type']; title: string; dueDate: string; notes: string };
function RemindersPage({ reminders, onAdd, onToggle, onRemove }: { reminders: Reminder[]; onAdd: (reminder: Reminder) => void; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const form = useForm<ReminderDraft>({ defaultValues: { type: 'appointment', title: '', dueDate: '', notes: '' } });
  const [error, setError] = useState('');
  const submit = (draft: ReminderDraft) => {
    if (!draft.title.trim() || !draft.dueDate || !Number.isFinite(new Date(`${draft.dueDate}T12:00:00`).getTime())) { setError('Add a title and a valid date for your reminder.'); return; }
    onAdd({ id: createId(), type: draft.type, title: draft.title.trim(), dueDate: draft.dueDate, notes: draft.notes.trim() || undefined, done: false });
    form.reset({ type: 'appointment', title: '', dueDate: '', notes: '' }); setError('');
  };
  const sorted = [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <main className="content page-enter">
    <PageHeading eyebrow="A LITTLE NUDGE" title="Reminders" subtitle="Keep appointment and medication notes in one place. These are in-app reminders only; they won’t send background notifications." />
    <div className="grid dashboard-grid">
      <Panel><div className="card-title"><div><div className="eyebrow">YOUR LIST</div><h2>Coming up & checked off</h2></div><span className="tag">{reminders.filter(r => !r.done).length} open</span></div>
        {sorted.length ? sorted.map(item => <div className={`reminder-row${item.done ? ' reminder-done' : ''}`} key={item.id} data-testid={`row-reminder-${item.id}`}><button className={`check${item.done ? ' done' : ''}`} aria-label={item.done ? 'Mark reminder open' : 'Mark reminder done'} onClick={() => onToggle(item.id)} data-testid={`button-toggle-reminder-${item.id}`}>{item.done && <Check size={12} />}</button><div className="date-tile"><b>{new Date(`${item.dueDate}T12:00:00`).getDate()}</b>{dateLabel(item.dueDate, { month: 'short' })}</div><div className="row-main"><strong>{item.title}</strong><span>{item.type === 'appointment' ? 'Appointment' : 'Medication'}{item.notes ? ` · ${item.notes}` : ''}</span></div><button className="icon-btn" aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Remove “${item.title}” from reminders?`)) onRemove(item.id); }} data-testid={`button-delete-reminder-${item.id}`}><Trash2 size={15} /></button></div>) : <EmptyState title="Nothing on your reminder list" body="Add an appointment to prepare for, or a personal medication note." />}
      </Panel>
      <Panel><div className="card-title"><div><div className="eyebrow">ADD TO YOUR LIST</div><h2>Make a reminder</h2></div><Plus size={18} color="#b87558" /></div>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)}><div className="form-grid">
          <div className="field full"><label htmlFor="rem-type">Reminder type</label><select id="rem-type" {...form.register('type')} data-testid="input-reminder-type"><option value="appointment">Appointment</option><option value="medication">Medication note</option></select></div>
          <div className="field full"><label htmlFor="rem-title">Title</label><input id="rem-title" {...form.register('title')} placeholder="e.g. Ask about cycle gaps" data-testid="input-reminder-title" /></div>
          <div className="field full"><label htmlFor="rem-date">Date</label><input id="rem-date" type="date" {...form.register('dueDate')} data-testid="input-reminder-date" /></div>
          <div className="field full"><label htmlFor="rem-notes">A note (optional)</label><textarea id="rem-notes" {...form.register('notes')} placeholder="Anything you want to remember" data-testid="input-reminder-notes" /></div>
        </div>{error && <div className="notice coral" role="alert" style={{ marginTop: 12 }} data-testid="status-reminder-error"><AlertCircle size={15} />{error}</div>}<button type="submit" className="btn" style={{ marginTop: 16, width: '100%' }} data-testid="button-add-reminder"><Plus size={15} /> Add reminder</button></form></Form>
      </Panel>
    </div>
    <div className="section-gap notice"><Clock3 size={17} /><div><strong>Just in this app.</strong> Cyclewise does not run background alerts or send notifications. Check this page when it’s useful to you.</div></div>
  </main>;
}

function Report({ journal }: { journal: Journal }) {
  const entries = [...journal.entries].sort((a, b) => a.date.localeCompare(b.date));
  const starts = getCycleStarts(entries);
  const lengths = cycleLengths(entries);
  const generateText = () => {
    const lines = [
      'CYCLEWISE · PERSONAL VISIT SUMMARY',
      `Prepared ${new Date().toLocaleDateString()}`,
      'This summary contains self-reported journal notes. It is not a diagnosis or medical assessment.',
      '',
      `Entries recorded: ${entries.length}`,
      `Recorded period starts: ${starts.length}`,
      `Cycle intervals calculated from consecutive recorded starts: ${lengths.length ? lengths.map(x => `${x.days} days (${dateLabel(x.start)})`).join('; ') : 'Not enough recorded starts to calculate'}`,
      '',
      'DAILY NOTES',
      ...entries.map(entry => {
        const parts = [`${dateLabel(entry.date)}:`];
        if (entry.periodStart) parts.push(`period start${entry.periodEnd ? ` to ${dateLabel(entry.periodEnd)}` : ''}`);
        if (entry.flowLevel) parts.push(`flow ${entry.flowLevel.toLowerCase()}`);
        if (entry.symptoms.length) parts.push(`symptoms ${entry.symptoms.map(s => `${s.name} (intensity ${s.severity}/3)`).join(', ')}`);
        if (entry.weightKg) parts.push(`weight ${entry.weightKg} kg`);
        if (bmiFor(entry)) parts.push(`BMI estimate ${bmiFor(entry)!.toFixed(1)}`);
        if (entry.sleepHours != null) parts.push(`sleep ${entry.sleepHours} hours`);
        if (entry.exerciseMinutes != null) parts.push(`movement ${entry.exerciseMinutes} minutes`);
        if (entry.stressLevel != null) parts.push(`stress ${entry.stressLevel}/5`);
        if (entry.mood) parts.push(`mood ${entry.mood}`);
        if (entry.dietNotes) parts.push(`food note: ${entry.dietNotes}`);
        if (entry.notes) parts.push(`note: ${entry.notes}`);
        return `• ${parts.join(' · ')}`;
      }),
      '',
      'Questions I may want to ask',
      '________________________________________________________________',
      '________________________________________________________________',
      '',
      'Only dates and details entered by the user are included. Sparse logs cannot establish a pattern. Please interpret this information with a qualified clinician.',
    ];
    return lines.join('\n');
  };
  const download = () => {
    const file = new Blob([generateText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'cyclewise-visit-summary.txt'; anchor.click();
    URL.revokeObjectURL(url);
  };
  const cycleDays = lengths.length ? lengths.map(x => x.days).join(', ') : 'Not enough data';
  const symptomCounts = entries.flatMap(e => e.symptoms).reduce<Record<string, number>>((acc, s) => { acc[s.name] = (acc[s.name] || 0) + 1; return acc; }, {});
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return <main className="content page-enter">
    <PageHeading eyebrow="TAKE YOUR OWN NOTES WITH YOU" title="A summary for your visit" subtitle="A simple, editable-feeling overview of what you’ve logged—ready to print or save." >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn ghost" onClick={() => window.print()} data-testid="button-print-report"><Printer size={15} /> Print</button><button className="btn" onClick={download} data-testid="button-download-report"><ArrowDownToLine size={15} /> Download .txt</button></div>
    </PageHeading>
    <NonDiagnosticNotice />
    <Panel className="section-gap report-paper">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid #e8e1d1', paddingBottom: 18, marginBottom: 17 }}>
        <div><div className="eyebrow">CYCLEWISE · PERSONAL VISIT SUMMARY</div><h2 style={{ fontSize: 28 }}>My notes for a conversation</h2><p className="subhead">Prepared {new Date().toLocaleDateString()} · Self-reported information</p></div><div className="tag"><LockKeyhole size={12} style={{ marginRight: 5 }} /> Local record</div>
      </div>
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <div className="card stat-card"><div className="stat-label">Days logged</div><div className="stat-value" data-testid="report-entry-count">{entries.length}</div><div className="stat-foot">Not every day needs a note</div></div>
        <div className="card stat-card"><div className="stat-label">Period starts</div><div className="stat-value" data-testid="report-period-count">{starts.length}</div><div className="stat-foot">Dates recorded</div></div>
        <div className="card stat-card"><div className="stat-label">Cycle intervals</div><div className="stat-value" style={{ fontSize: lengths.length ? 22 : 29 }} data-testid="report-cycle-days">{cycleDays}</div><div className="stat-foot">Days between recorded starts</div></div>
        <div className="card stat-card"><div className="stat-label">Symptoms noted</div><div className="stat-value" data-testid="report-symptoms-count">{Object.values(symptomCounts).reduce((a, b) => a + b, 0)}</div><div className="stat-foot">{topSymptoms.map(([name]) => name).join(', ') || 'No symptoms noted'}</div></div>
      </div>
      <h3>Daily notes</h3>
      {entries.length ? entries.slice().reverse().map(entry => <div className="entry-row" key={entry.id} data-testid={`report-row-${entry.id}`}><div className="date-tile"><b>{new Date(`${entry.date}T12:00:00`).getDate()}</b>{dateLabel(entry.date, { month: 'short' })}</div><div className="row-main"><strong>{dateLabel(entry.date)}{entry.periodStart ? ` · Period start${entry.flowLevel ? ` · ${entry.flowLevel.toLowerCase()} flow` : ''}` : ''}</strong><span>{[entry.symptoms.length ? entry.symptoms.map(s => `${s.name} (${s.severity}/3)`).join(', ') : '', entry.sleepHours != null ? `${entry.sleepHours}h sleep` : '', entry.exerciseMinutes != null ? `${entry.exerciseMinutes} min movement` : '', entry.stressLevel != null ? `stress ${entry.stressLevel}/5` : '', entry.mood, entry.notes, entry.dietNotes].filter(Boolean).join(' · ') || 'No additional details recorded'}</span></div></div>) : <EmptyState title="Nothing to summarize yet" body="Add a few notes when you’re ready. Your report will reflect only what you chose to record." action={<Link href="/log" className="btn secondary small" data-testid="button-report-first-entry">Add a note</Link>} />}
      <div className="section-gap" style={{ borderTop: '1px solid #e8e1d1', paddingTop: 18 }}><h3>What I’d like to ask</h3><div style={{ height: 48, borderBottom: '1px solid #d8d1c3' }} /><div style={{ height: 42, borderBottom: '1px solid #d8d1c3' }} /></div>
      <div className="notice coral section-gap"><CircleHelp size={16} /><div>Cyclewise organizes self-reported details. It does not diagnose, assess, or recommend treatment. Sparse or short logs cannot establish patterns; discuss your records with a clinician.</div></div>
    </Panel>
  </main>;
}

function SettingsPage({ journal, onClear, onDemo }: { journal: Journal; onClear: () => void; onDemo: () => void }) {
  const [restoreMessage, setRestoreMessage] = useState('');
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), journal }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `cyclewise-backup-${today()}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed.journal || parsed;
      if (!Array.isArray(data.entries) || !Array.isArray(data.reminders)) throw new Error('That file does not look like a Cyclewise backup.');
      localStorage.setItem('cyclewise-journal-v1', JSON.stringify({ entries: data.entries, reminders: data.reminders, preferences: data.preferences || {} }));
      window.location.reload();
    } catch {
      setRestoreMessage('We couldn’t read that backup. Choose a Cyclewise JSON backup and try again.');
    }
  };
  const erase = () => { if (window.confirm('Erase all Cyclewise notes and reminders stored in this browser? This cannot be undone. Export a backup first if you want to keep a copy.')) onClear(); };
  return <main className="content page-enter">
    <PageHeading eyebrow="YOUR SPACE, YOUR CHOICE" title="Privacy & data" subtitle="No login, no network requests, and no remote storage. Your journal lives in this browser." />
    <div className="grid dashboard-grid">
      <Panel>
        <div className="card-title"><div><div className="eyebrow">LOCAL BY DEFAULT</div><h2>Your journal stays on this device</h2></div><LockKeyhole size={19} color="#b87558" /></div>
        <p className="subhead" style={{ maxWidth: 550 }}>Cyclewise stores entries and reminders in your browser’s local storage. Clearing browser data can remove them. This is a personal journal, not a secure medical record or a substitute for care.</p>
        <div className="privacy-box section-gap"><strong style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><ShieldCheck size={16} /> A few practical details</strong><ul style={{ fontSize: 11, lineHeight: 1.8, paddingLeft: 19, marginBottom: 0 }}><li>There is no account, analytics backend, or server sync.</li><li>Anyone with access to this browser profile may be able to view its saved data.</li><li>Use backup export to keep a copy before changing devices or clearing browser storage.</li></ul></div>
      </Panel>
      <Panel>
        <div className="card-title"><div><div className="eyebrow">YOUR DATA</div><h2>Take it or start again</h2></div><ArrowDownToLine size={18} color="#b87558" /></div>
        <div className="entry-row"><div className="date-tile"><b>{journal.entries.length}</b>notes</div><div className="row-main"><strong>Daily entries</strong><span>Stored on this device</span></div></div>
        <div className="entry-row"><div className="date-tile"><b>{journal.reminders.length}</b>items</div><div className="row-main"><strong>Reminders</strong><span>Stored on this device</span></div></div>
        <div style={{ display: 'grid', gap: 9, marginTop: 17 }}>
          <button className="btn" onClick={exportBackup} data-testid="button-export-backup"><ArrowDownToLine size={15} /> Download a data backup</button>
          <label className="btn secondary" htmlFor="restore-backup" style={{ cursor: 'pointer' }} data-testid="label-import-backup"><ArrowRight size={15} /> Restore from backup</label><input id="restore-backup" type="file" accept="application/json,.json" onChange={e => importBackup(e.target.files?.[0])} style={{ display: 'none' }} data-testid="input-import-backup" />
          {restoreMessage && <div className="notice coral" role="alert" data-testid="status-restore-error"><AlertCircle size={15} />{restoreMessage}</div>}
        </div>
      </Panel>
    </div>
    <div className="grid dashboard-grid section-gap">
      <Panel><div className="card-title"><div><div className="eyebrow">RESET THE JOURNAL</div><h2>Erase local records</h2></div><Trash2 size={18} color="#a45647" /></div><p className="subhead" style={{ marginBottom: 16 }}>Permanently remove all entries, reminders, and preferences saved by Cyclewise in this browser. You’ll be asked to confirm.</p><button className="btn danger" onClick={erase} data-testid="button-erase-data"><Trash2 size={15} /> Erase all my records</button></Panel>
      <Panel><div className="card-title"><div><div className="eyebrow">JUST EXPLORING?</div><h2>Preview fictional data</h2></div><Sparkles size={18} color="#b87558" /></div><p className="subhead" style={{ marginBottom: 16 }}>A clearly labeled made-up example helps you see how charts and summaries work. It replaces this view until you add a personal note or erase it.</p><button className="btn secondary" onClick={onDemo} data-testid="button-load-demo-settings">Load fictional sample</button></Panel>
    </div>
  </main>;
}

function NotFound() {
  return <main className="content page-enter"><PageHeading eyebrow="NOT HERE" title="This page wandered off." subtitle="Let’s bring you back to your journal." /><Link className="btn" href="/" data-testid="link-not-found-home">Back to overview <ArrowRight size={15} /></Link></main>;
}

export default App;
