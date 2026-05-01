import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { Button } from '../components/Button/Button';
import { Tabs } from '../components/Tabs/Tabs';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { Select } from '../components/Select/Select';
import { SidePanel } from '../components/SidePanel/SidePanel';
import {
  eventsService,
  eventCategoriesService,
  eventSessionsService,
  eventSeatsService,
  EVENT_TYPES,
} from '../services/events';
import type {
  EventDetail as EventDetailType,
  EventSession,
  EventSeat,
  EventType,
  EventCategory,
  SessionPricingType,
} from '../services/events';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import styles from './EventDetail.module.css';

const PRICING_TYPES: { value: SessionPricingType; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'per_seat', label: 'Per seat' },
  { value: 'daily', label: 'Daily' },
  { value: 'evening', label: 'Evening' },
  { value: 'all', label: 'All' },
];

type SessionForm = {
  starts_at: string;
  ends_at: string;
  base_price: string;
  pricing_type: SessionPricingType;
  cinema_name: string;
  hall_name: string;
};

type SeatForm = {
  label: string;
  zone: string;
  price: string;
  is_available: boolean;
};

function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');

  const [categories, setCategories] = useState<EventCategory[]>([]);

  // overview form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('events');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [savingOverview, setSavingOverview] = useState(false);

  // session
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<EventSession | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionForm>({
    starts_at: '',
    ends_at: '',
    base_price: '0',
    pricing_type: 'fixed',
    cinema_name: '',
    hall_name: '',
  });
  const [savingSession, setSavingSession] = useState(false);

  // seat
  const [seatPanelOpen, setSeatPanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [editingSeat, setEditingSeat] = useState<EventSeat | null>(null);
  const [seatForm, setSeatForm] = useState<SeatForm>({
    label: '',
    zone: '',
    price: '0',
    is_available: true,
  });
  const [savingSeat, setSavingSeat] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await eventsService.getEvent(eventId);
      setEvent(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setType(data.type);
      setCity(data.city || '');
      setCategoryId(data.category_id || '');
      setPosterUrl(data.poster_url || data.image_url || '');
      setTrailerUrl(data.trailer_url || '');
      setIsActive(data.is_active);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cats = await eventCategoriesService.getCategories({ limit: 100 });
        if (alive) setCategories(cats.items || []);
      } catch {
        // optional
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleOverviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setSavingOverview(true);
    try {
      const updated = await eventsService.updateEvent(eventId, {
        title,
        description: description || undefined,
        type,
        city,
        category_id: categoryId || undefined,
        poster_url: posterUrl || undefined,
        trailer_url: trailerUrl || undefined,
        is_active: isActive,
      });
      setEvent(updated);
      toast.success('Event updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setSavingOverview(false);
    }
  };

  const openSessionPanel = (session?: EventSession) => {
    setEditingSession(session || null);
    if (session) {
      setSessionForm({
        starts_at: toLocalInput(session.starts_at),
        ends_at: toLocalInput(session.ends_at),
        base_price: String(session.base_price),
        pricing_type: session.pricing_type,
        cinema_name: session.cinema_name || '',
        hall_name: session.hall_name || '',
      });
    } else {
      setSessionForm({
        starts_at: '',
        ends_at: '',
        base_price: '0',
        pricing_type: 'fixed',
        cinema_name: '',
        hall_name: '',
      });
    }
    setSessionPanelOpen(true);
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const startsAt = fromLocalInput(sessionForm.starts_at);
    if (!startsAt) {
      toast.error('Start time is required');
      return;
    }
    setSavingSession(true);
    try {
      const payload = {
        starts_at: startsAt,
        ends_at: fromLocalInput(sessionForm.ends_at),
        base_price: Number(sessionForm.base_price) || 0,
        pricing_type: sessionForm.pricing_type,
        cinema_name: sessionForm.cinema_name || undefined,
        hall_name: sessionForm.hall_name || undefined,
      };
      if (editingSession) {
        await eventSessionsService.update(editingSession.id, payload);
        toast.success('Session updated');
      } else {
        await eventSessionsService.create(eventId, payload);
        toast.success('Session created');
      }
      setSessionPanelOpen(false);
      fetchEvent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session');
    } finally {
      setSavingSession(false);
    }
  };

  const handleSessionDelete = async (session: EventSession) => {
    const ok = await confirm({
      title: 'Delete session',
      message: 'Delete this session? All seats will be removed.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await eventSessionsService.delete(session.id);
      toast.success('Session deleted');
      fetchEvent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session');
    }
  };

  const openSeatPanel = (sessionId: string, seat?: EventSeat) => {
    setActiveSessionId(sessionId);
    setEditingSeat(seat || null);
    if (seat) {
      setSeatForm({
        label: seat.label,
        zone: seat.zone || '',
        price: String(seat.price),
        is_available: seat.is_available,
      });
    } else {
      setSeatForm({ label: '', zone: '', price: '0', is_available: true });
    }
    setSeatPanelOpen(true);
  };

  const handleSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId) return;
    setSavingSeat(true);
    try {
      const payload = {
        label: seatForm.label,
        zone: seatForm.zone || undefined,
        price: Number(seatForm.price) || 0,
        is_available: seatForm.is_available,
      };
      if (editingSeat) {
        await eventSeatsService.update(editingSeat.id, payload);
        toast.success('Seat updated');
      } else {
        await eventSeatsService.create(activeSessionId, payload);
        toast.success('Seat created');
      }
      setSeatPanelOpen(false);
      fetchEvent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save seat');
    } finally {
      setSavingSeat(false);
    }
  };

  const handleSeatDelete = async (seat: EventSeat) => {
    const ok = await confirm({
      title: 'Delete seat',
      message: `Delete seat "${seat.label}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await eventSeatsService.delete(seat.id);
      toast.success('Seat deleted');
      fetchEvent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete seat');
    }
  };

  const sortedSessions = useMemo(
    () =>
      [...(event?.sessions || [])].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [event],
  );

  if (isLoading || !event) {
    return (
      <div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/events')}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          {isLoading ? 'Loading...' : 'Event not found'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => navigate('/events')}>
        <ArrowLeft size={14} /> Back
      </Button>

      <div style={{ height: '1rem' }} />

      <PageHeader
        title={event.title}
        subtitle={`${event.type} · ${event.city || 'No city'}`}
      />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'sessions', label: `Sessions (${event.sessions.length})` },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'overview' | 'sessions')}
      >
        {activeTab === 'overview' && (
          <form onSubmit={handleOverviewSave} className={styles.formCard}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <TextField
              label="Poster URL"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
            />
            <TextField
              label="Trailer URL"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://..."
            />
            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (visible in app)
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={savingOverview}>
                {savingOverview ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'sessions' && (
          <div className={styles.sessionsWrap}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => openSessionPanel()}>
                <Plus size={16} /> Add session
              </Button>
            </div>

            {sortedSessions.length === 0 && (
              <div className={styles.emptyState}>No sessions yet.</div>
            )}

            {sortedSessions.map((session) => (
              <div key={session.id} className={styles.sessionCard}>
                <div className={styles.sessionHeader}>
                  <div>
                    <div className={styles.sessionTitle}>
                      {new Date(session.starts_at).toLocaleString()}
                      {session.ends_at ? ` → ${new Date(session.ends_at).toLocaleString()}` : ''}
                    </div>
                    <div className={styles.sessionMeta}>
                      {session.pricing_type} · base {session.base_price}
                      {session.cinema_name ? ` · ${session.cinema_name}` : ''}
                      {session.hall_name ? ` · ${session.hall_name}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => openSeatPanel(session.id)}>
                      <Plus size={14} /> Seat
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openSessionPanel(session)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleSessionDelete(session)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {(session.seats || []).length === 0 ? (
                  <div className={styles.emptySeats}>No seats configured.</div>
                ) : (
                  <table className={styles.seatsTable}>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Zone</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.seats.map((seat) => (
                        <tr key={seat.id}>
                          <td>{seat.label}</td>
                          <td>{seat.zone || '—'}</td>
                          <td>{seat.price}</td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: seat.is_available
                                  ? 'var(--color-success)'
                                  : 'var(--color-text-tertiary)',
                              }}
                            >
                              {seat.is_available ? 'Available' : 'Sold'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => openSeatPanel(session.id, seat)}
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.danger}`}
                                onClick={() => handleSeatDelete(seat)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Tabs>

      <SidePanel
        isOpen={sessionPanelOpen}
        onClose={() => setSessionPanelOpen(false)}
        title={editingSession ? 'Edit session' : 'Add session'}
      >
        <form onSubmit={handleSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Starts at"
            type="datetime-local"
            value={sessionForm.starts_at}
            onChange={(e) => setSessionForm({ ...sessionForm, starts_at: e.target.value })}
            required
          />
          <TextField
            label="Ends at"
            type="datetime-local"
            value={sessionForm.ends_at}
            onChange={(e) => setSessionForm({ ...sessionForm, ends_at: e.target.value })}
          />
          <TextField
            label="Base price"
            type="number"
            step="0.01"
            min={0}
            value={sessionForm.base_price}
            onChange={(e) => setSessionForm({ ...sessionForm, base_price: e.target.value })}
            required
          />
          <Select
            label="Pricing type"
            value={sessionForm.pricing_type}
            onChange={(e) =>
              setSessionForm({ ...sessionForm, pricing_type: e.target.value as SessionPricingType })
            }
            options={PRICING_TYPES.map((p) => ({ value: p.value, label: p.label }))}
          />
          <TextField
            label="Cinema name"
            value={sessionForm.cinema_name}
            onChange={(e) => setSessionForm({ ...sessionForm, cinema_name: e.target.value })}
          />
          <TextField
            label="Hall name"
            value={sessionForm.hall_name}
            onChange={(e) => setSessionForm({ ...sessionForm, hall_name: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setSessionPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingSession}>
              {savingSession ? 'Saving...' : editingSession ? 'Save' : 'Add session'}
            </Button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        isOpen={seatPanelOpen}
        onClose={() => setSeatPanelOpen(false)}
        title={editingSeat ? 'Edit seat' : 'Add seat'}
      >
        <form onSubmit={handleSeatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Label"
            value={seatForm.label}
            onChange={(e) => setSeatForm({ ...seatForm, label: e.target.value })}
            placeholder="e.g. A12"
            required
          />
          <TextField
            label="Zone"
            value={seatForm.zone}
            onChange={(e) => setSeatForm({ ...seatForm, zone: e.target.value })}
            placeholder="VIP, Stalls, Balcony..."
          />
          <TextField
            label="Price"
            type="number"
            step="0.01"
            min={0}
            value={seatForm.price}
            onChange={(e) => setSeatForm({ ...seatForm, price: e.target.value })}
            required
          />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={seatForm.is_available}
              onChange={(e) => setSeatForm({ ...seatForm, is_available: e.target.checked })}
            />
            Available
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setSeatPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingSeat}>
              {savingSeat ? 'Saving...' : editingSeat ? 'Save' : 'Add seat'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
