import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Edit2, Plus, Trash2, Upload } from 'lucide-react';

import { Button } from '../components/Button/Button';
import { DataTable } from '../components/DataTable/DataTable';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { Pagination } from '../components/Pagination/Pagination';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextArea } from '../components/TextArea/TextArea';
import { TextField } from '../components/TextField/TextField';
import { useToast } from '../components/Toast/useToast';
import { useConfirm } from '../components/ConfirmDialog/useConfirm';
import styles from './Events.module.css';
import {
  eventCategoriesService,
  eventsService,
  type EventCategory,
  type EventCreateInput,
  type EventListItem,
  type EventType,
} from '../services/events';

const PAGE_SIZE = 12;
const EVENT_TYPES: EventType[] = ['cinema', 'concerts', 'stand-up', 'sports', 'kids', 'events'];

type EventFormState = {
  title: string;
  description: string;
  type: EventType;
  city: string;
  categoryId: string;
  startDateTime: string;
  endDateTime: string;
  venueId: string;
  price: string;
  maxCapacity: string;
  isActive: boolean;
};

const DEFAULT_FORM_STATE: EventFormState = {
  title: '',
  description: '',
  type: 'cinema',
  city: '',
  categoryId: '',
  startDateTime: '',
  endDateTime: '',
  venueId: '',
  price: '',
  maxCapacity: '',
  isActive: true,
};

const TYPE_COPY: Record<EventType, { title: string; description: string; accent: string; showVenue: boolean; showPrice: boolean; showCapacity: boolean }> = {
  cinema: {
    title: 'Cinema event',
    description: 'Use schedule, pricing and capacity fields for premieres, screenings and special showings.',
    accent: '#c84b31',
    showVenue: false,
    showPrice: true,
    showCapacity: true,
  },
  concerts: {
    title: 'Concert',
    description: 'Fill in the time window and ticketing fields for live shows and music nights.',
    accent: '#126b8a',
    showVenue: false,
    showPrice: true,
    showCapacity: true,
  },
  'stand-up': {
    title: 'Stand-up',
    description: 'Good for comedy nights and small-format shows with seating capacity.',
    accent: '#7a4f01',
    showVenue: false,
    showPrice: true,
    showCapacity: true,
  },
  sports: {
    title: 'Sports event',
    description: 'Use it for matches, tournaments and watch parties.',
    accent: '#0f766e',
    showVenue: false,
    showPrice: true,
    showCapacity: true,
  },
  kids: {
    title: 'Kids event',
    description: 'Family-focused sessions lean on venue details instead of ticketing fields.',
    accent: '#8a4dff',
    showVenue: true,
    showPrice: false,
    showCapacity: false,
  },
  events: {
    title: 'General event',
    description: 'Use this for everything that is not tied to a fixed ticketing model.',
    accent: '#b54708',
    showVenue: true,
    showPrice: false,
    showCapacity: false,
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const parseNumberOrUndefined = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildPayload = (form: EventFormState): EventCreateInput => ({
  title: form.title.trim(),
  description: form.description.trim() || undefined,
  type: form.type,
  city: form.city.trim(),
  category_id: form.categoryId || undefined,
  is_active: form.isActive,
  start_datetime: form.startDateTime ? new Date(form.startDateTime).toISOString() : undefined,
  end_datetime: form.endDateTime ? new Date(form.endDateTime).toISOString() : undefined,
  venue_id: form.venueId.trim() || undefined,
  price: parseNumberOrUndefined(form.price),
  max_capacity: parseNumberOrUndefined(form.maxCapacity),
});

export default function EventsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM_STATE);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);

  const activeTypeCopy = TYPE_COPY[form.type];
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [activeCategoryId, categories],
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await eventCategoriesService.getCategories({ limit: 100 });
      setCategories(response.items);
    } catch (error) {
      console.error('Failed to load event categories', error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await eventsService.getEvents({
        query: query.trim() || undefined,
        category_id: activeCategoryId || undefined,
        offset,
        limit: PAGE_SIZE,
      });
      setEvents(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load events', error);
      toast.error('Unable to load events');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategoryId, offset, query, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    setOffset(0);
  }, [query, activeCategoryId]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM_STATE);
    setPosterFile(null);
    setTrailerFile(null);
  }, []);

  const openCreatePanel = () => {
    resetForm();
    setIsPanelOpen(true);
  };

  const handleDelete = async (eventItem: EventListItem) => {
    const confirmed = await confirm({
      title: 'Delete event',
      message: `Delete ${eventItem.title}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await eventsService.deleteEvent(eventItem.id);
      toast.success('Event deleted');
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete event', error);
      toast.error('Unable to delete event');
    }
  };

  const submitCreate = async () => {
    if (!form.title.trim() || !form.city.trim()) {
      toast.error('Title and city are required');
      return;
    }

    if (!posterFile || !trailerFile) {
      toast.error('Poster and trailer files are required');
      return;
    }

    setIsSaving(true);
    try {
      const created = await eventsService.createEvent(buildPayload(form));
      const withPoster = await eventsService.uploadEventPoster(created.id, posterFile);
      const withTrailer = await eventsService.uploadEventTrailer(withPoster.id, trailerFile);
      toast.success('Event created');
      setIsPanelOpen(false);
      resetForm();
      await loadEvents();
      navigate(`/events/${withTrailer.id}`);
    } catch (error) {
      console.error('Failed to create event', error);
      toast.error('Unable to create event');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`page-shell ${styles.page}`}>
      <PageHeader
        title="Events"
        subtitle="Search, filter and create events with file uploads for poster and trailer media."
        action={(
          <Button variant="primary" onClick={openCreatePanel} className={styles.primaryAction}>
            <Plus size={16} /> New event
          </Button>
        )}
      />

      <section className={`panel ${styles.searchPanel}`}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search events, cities or categories"
        />
      </section>

      <section className={`panel ${styles.filtersPanel}`}>
        <div className={styles.chipRow} aria-label="Event category filters">
          <button
            type="button"
            className={`${styles.chip} ${!activeCategoryId ? styles.chipActive : ''}`}
            onClick={() => setActiveCategoryId('')}
          >
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`${styles.chip} ${activeCategoryId === category.id ? styles.chipActive : ''}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className={`panel ${styles.tablePanel}`}>
        <DataTable
          isLoading={isLoading}
          data={events}
          keyExtractor={(event: EventListItem) => event.id}
          columns={[
            {
              key: 'title',
              header: 'Event',
              render: (event: EventListItem) => (
                <div className={styles.eventCell}>
                  <div className={styles.eventPoster}>
                    {event.poster_url ? (
                      <img src={event.poster_url} alt={event.title} />
                    ) : (
                      <div className={styles.eventPosterFallback}>No poster</div>
                    )}
                  </div>
                  <div>
                    <div className={styles.eventTitle}>{event.title}</div>
                    <div className={styles.eventMeta}>{event.city}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (event: EventListItem) => TYPE_COPY[event.type].title,
            },
            {
              key: 'category',
              header: 'Category',
              render: (event: EventListItem) => event.category?.name ?? '—',
            },
            {
              key: 'date',
              header: 'Start',
              render: (event: EventListItem) => formatDateTime(event.start_datetime ?? event.next_session_at),
            },
            {
              key: 'price',
              header: 'Price',
              render: (event: EventListItem) => (event.min_price != null ? `$${event.min_price}` : '—'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (event: EventListItem) => (
                <span className={`${styles.statusPill} ${event.is_active ? styles.statusActive : styles.statusInactive}`}>
                  {event.is_active ? 'Active' : 'Hidden'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (event: EventListItem) => (
                <div className={styles.actions}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/events/${event.id}`)} className={styles.actionButton}>
                    <ArrowRight size={14} /> Open
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/events/${event.id}`)} className={styles.actionButton}>
                    <Edit2 size={14} /> Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(event)} className={styles.actionButton}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              ),
            },
          ]}
          onRowClick={(event: EventListItem) => navigate(`/events/${event.id}`)}
        />

        <Pagination
          total={total}
          offset={offset}
          limit={PAGE_SIZE}
          onChange={setOffset}
        />
      </section>

      <SidePanel
        isOpen={isPanelOpen}
        title="Create event"
        onClose={() => setIsPanelOpen(false)}
      >
        <div className={styles.form}>
          <div className={styles.typeGrid} role="tablist" aria-label="Event type">
            {EVENT_TYPES.map((type) => {
              const isActive = form.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  className={`${styles.typeChip} ${isActive ? styles.typeChipActive : ''}`}
                  onClick={() => setForm((current) => ({ ...current, type }))}
                >
                  <span className={styles.typeChipTitle}>{TYPE_COPY[type].title}</span>
                  <span className={styles.typeChipNote}>{TYPE_COPY[type].description}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.typeSummary} style={{ borderColor: activeTypeCopy.accent }}>
            <div className={styles.typeSummaryTitle}>{activeTypeCopy.title}</div>
            <div className={styles.typeSummaryNote}>{activeTypeCopy.description}</div>
          </div>

          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Movie night at the plaza"
            required
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Add a short description of the event..."
            rows={4}
          />

          <div className={styles.gridTwo}>
            <TextField
              label="City"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="Almaty"
              required
            />
            <TextField
              label="Category ID"
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              placeholder="Select from category chips or paste an ID"
            />
          </div>

          <div className={styles.gridTwo}>
            <TextField
              label="Start date and time"
              type="datetime-local"
              value={form.startDateTime}
              onChange={(event) => setForm((current) => ({ ...current, startDateTime: event.target.value }))}
            />
            <TextField
              label="End date and time"
              type="datetime-local"
              value={form.endDateTime}
              onChange={(event) => setForm((current) => ({ ...current, endDateTime: event.target.value }))}
            />
          </div>

          {activeTypeCopy.showVenue ? (
            <TextField
              label="Venue ID"
              value={form.venueId}
              onChange={(event) => setForm((current) => ({ ...current, venueId: event.target.value }))}
              placeholder="Optional venue identifier"
            />
          ) : null}

          {activeTypeCopy.showPrice || activeTypeCopy.showCapacity ? (
            <div className={styles.gridTwo}>
              {activeTypeCopy.showPrice ? (
                <TextField
                  label="Price"
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="25"
                />
              ) : (
                <div className={styles.placeholderCard}>
                  This event type does not need a ticket price.
                </div>
              )}
              {activeTypeCopy.showCapacity ? (
                <TextField
                  label="Max capacity"
                  type="number"
                  value={form.maxCapacity}
                  onChange={(event) => setForm((current) => ({ ...current, maxCapacity: event.target.value }))}
                  placeholder="120"
                />
              ) : (
                <div className={styles.placeholderCard}>
                  Capacity is optional for this event type.
                </div>
              )}
            </div>
          ) : null}

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span>Publish immediately</span>
          </label>

          <div className={styles.uploadStack}>
            <ImageUpload
              label="Poster file"
              onFileSelect={setPosterFile}
            />

            <label className={styles.fileUpload}>
              <span className={styles.fileUploadLabel}>Trailer file</span>
              <input
                type="file"
                accept="video/mp4,video/x-matroska,video/webm"
                onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)}
              />
              <span className={styles.fileUploadHint}>
                MP4 or MKV only. The uploader stores the file in MinIO.
              </span>
              {trailerFile ? <span className={styles.fileUploadName}>{trailerFile.name}</span> : null}
            </label>
          </div>
        </div>

        <div className={styles.panelFooter}>
          <Button variant="secondary" onClick={() => setIsPanelOpen(false)} className={styles.footerButton}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitCreate} disabled={isSaving} className={styles.footerButton}>
            <Upload size={16} /> {isSaving ? 'Saving...' : 'Create event'}
          </Button>
        </div>
      </SidePanel>
    </div>
  );
}

export { EventsPage as Events };
