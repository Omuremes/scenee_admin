import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { eventsService } from '../services/events';
import type { Event } from '../services/events';

export function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('events');
  const [posterUrl, setPosterUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await eventsService.getEvents();
      setEvents(response.items || []);
    } catch (err: any) {
      console.error('Failed to fetch events', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setCity(editingEvent.city);
      setType(editingEvent.type || editingEvent.event_type || 'events');
      setPosterUrl(editingEvent.poster_url || editingEvent.image_url || '');
      setDescription(editingEvent.description || '');
    } else {
      setTitle('');
      setCity('');
      setType('events');
      setPosterUrl('');
      setDescription('');
    }
  }, [editingEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data = { 
        title,
        city,
        type,
        poster_url: posterUrl || undefined,
        description: description || undefined,
        is_active: true
      };

      if (editingEvent) {
        await eventsService.updateEvent(editingEvent.id, data);
      } else {
        await eventsService.createEvent(data);
      }

      setIsPanelOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsPanelOpen(true);
  };

  const handleDelete = async (event: Event) => {
    if (!window.confirm(`Are you sure you want to delete the event "${event.title}"?`)) {
      return;
    }
    
    try {
      await eventsService.deleteEvent(event.id);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const openCreatePanel = () => {
    setEditingEvent(null);
    setIsPanelOpen(true);
  };

  const columns: Column<Event>[] = [
    { key: 'title', header: 'Title' },
    { key: 'city', header: 'City' },
    { key: 'type', header: 'Type', render: (item) => item.type || item.event_type || 'events' },
    { 
      key: 'poster_url', 
      header: 'Poster', 
      render: (item) => (item.poster_url || item.image_url) ? (
        <img src={item.poster_url || item.image_url} alt={item.title} style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
      ) : 'No photo'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Edit Event"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
            title="Delete Event"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader 
        title="Events" 
        subtitle="Manage local events and sessions"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add Event
          </Button>
        }
      />

      <DataTable 
        data={events} 
        columns={columns} 
        keyExtractor={(item) => item.id} 
        isLoading={isLoading}
      />

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        title={editingEvent ? "Edit Event" : "Add New Event"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
          
          <TextField 
            label="Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Summer Music Festival"
          />

          <TextField 
            label="City" 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder="e.g. New York"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                padding: 'var(--spacing-2) var(--spacing-3)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                backgroundColor: 'var(--color-surface)',
                outline: 'none'
              }}
            >
              <option value="events">Event</option>
              <option value="concerts">Concert</option>
              <option value="theatre">Theatre</option>
            </select>
          </div>

          <TextField 
            label="Poster URL" 
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://..."
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                minHeight: '100px',
                fontFamily: 'inherit',
                fontSize: '0.875rem'
              }}
              placeholder="Event description..."
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Create Event')}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
