import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { Select } from '../components/Select/Select';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Pagination } from '../components/Pagination/Pagination';
import { Toolbar } from '../components/Toolbar/Toolbar';
import {
  eventsService,
  eventCategoriesService,
  EVENT_TYPES,
} from '../services/events';
import type {
  EventListItem,
  EventCategory,
  EventType,
} from '../services/events';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PAGE_SIZE = 20;

export function Events() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [items, setItems] = useState<EventListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [city, setCity] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [categories, setCategories] = useState<EventCategory[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('events');
  const [posterUrl, setPosterUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await eventsService.getEvents({
        type: (typeFilter || undefined) as EventType | undefined,
        city: city || undefined,
        category_id: categoryFilter || undefined,
        offset,
        limit: PAGE_SIZE,
      });
      setItems(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, city, categoryFilter, offset, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [typeFilter, city, categoryFilter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cats = await eventCategoriesService.getCategories({ limit: 100 });
        if (alive) setCategories(cats.items || []);
      } catch {
        // categories list might be empty
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const openCreatePanel = () => {
    setTitle('');
    setDescription('');
    setType('events');
    setPosterUrl('');
    setTrailerUrl('');
    setFormCity('');
    setFormCategory('');
    setIsActive(true);
    setIsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await eventsService.createEvent({
        title,
        description: description || undefined,
        type,
        city: formCity,
        poster_url: posterUrl || undefined,
        trailer_url: trailerUrl || undefined,
        category_id: formCategory || undefined,
        is_active: isActive,
      });
      toast.success('Event created');
      setIsPanelOpen(false);
      fetchData();
      navigate(`/events/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (event: EventListItem) => {
    const ok = await confirm({
      title: 'Delete event',
      message: `Delete "${event.title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await eventsService.deleteEvent(event.id);
      toast.success('Event deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    }
  };

  const handleToggleActive = async (event: EventListItem) => {
    try {
      await eventsService.setActive(event.id, !event.is_active);
      toast.success(`Event ${!event.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event status');
    }
  };

  const typeOptions = useMemo(
    () => [{ value: '', label: 'All types' }, ...EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))],
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const columns: Column<EventListItem>[] = [
    {
      key: 'poster_url',
      header: 'Poster',
      render: (item) => {
        const url = item.poster_url || item.image_url;
        return url ? (
          <img
            src={url}
            alt={item.title}
            style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
          />
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
        );
      },
    },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'city', header: 'City' },
    {
      key: 'is_active',
      header: 'Active',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleActive(item); }}
          style={{
            padding: '2px 10px',
            borderRadius: 999,
            border: '1px solid',
            borderColor: item.is_active ? 'var(--color-success)' : 'var(--color-border-light)',
            color: item.is_active ? 'var(--color-success)' : 'var(--color-text-tertiary)',
            backgroundColor: 'transparent',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {item.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/events/${item.id}`); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}
            title="Open"
            type="button"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/events/${item.id}`); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}
            title="Edit"
            type="button"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}
            title="Delete"
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Manage local events, sessions and seating"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add event
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={city} onChange={setCity} placeholder="Filter by city..." />
        <Select
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={typeOptions}
        />
        <Select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categoryOptions}
        />
      </Toolbar>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/events/${item.id}`)}
      />
      <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Add new event"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Summer Music Festival"
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            required
          />
          <TextField
            label="City"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
            required
            placeholder="e.g. New York"
          />
          <Select
            label="Category"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
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

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create & open'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
