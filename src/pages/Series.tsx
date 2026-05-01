import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { seriesService } from '../services/series';
import type { Serial } from '../services/series';

export function Series() {
  const [series, setSeries] = useState<Serial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingSeries, setEditingSeries] = useState<Serial | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchSeries = async () => {
    setIsLoading(true);
    try {
      const response = await seriesService.getSeries();
      setSeries(response.items || []);
    } catch (err: any) {
      console.error('Failed to fetch series', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  useEffect(() => {
    if (editingSeries) {
      setName(editingSeries.name);
      setDescription(editingSeries.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingSeries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data = { 
        name, 
        description: description || undefined
      };

      if (editingSeries) {
        await seriesService.updateSeries(editingSeries.id, data);
      } else {
        await seriesService.createSeries(data);
      }

      setIsPanelOpen(false);
      setEditingSeries(null);
      fetchSeries();
    } catch (err: any) {
      setError(err.message || 'Failed to save series');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (serial: Serial) => {
    setEditingSeries(serial);
    setIsPanelOpen(true);
  };

  const handleDelete = async (serial: Serial) => {
    if (!window.confirm(`Are you sure you want to delete "${serial.name}"?`)) {
      return;
    }
    
    try {
      await seriesService.deleteSeries(serial.id);
      fetchSeries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete series');
    }
  };

  const openCreatePanel = () => {
    setEditingSeries(null);
    setIsPanelOpen(true);
  };

  const columns: Column<Serial>[] = [
    { key: 'name', header: 'Title' },
    { key: 'seasons_count', header: 'Seasons', render: (item) => item.seasons_count },
    { key: 'average_rating', header: 'Rating', render: (item) => item.average_rating?.toFixed(1) ?? '0.0' },
    { key: 'description', header: 'Description', render: (item) => item.description ? `${item.description.substring(0, 50)}...` : '-' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Edit Series"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
            title="Delete Series"
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
        title="Series" 
        subtitle="Manage TV series and their seasons"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add Series
          </Button>
        }
      />

      <DataTable 
        data={series} 
        columns={columns} 
        keyExtractor={(item) => item.id} 
        isLoading={isLoading}
      />

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        title={editingSeries ? "Edit Series" : "Add New Series"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
          
          <TextField 
            label="Title" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Breaking Bad"
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
              placeholder="Series description..."
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingSeries ? 'Save Changes' : 'Create Series')}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
