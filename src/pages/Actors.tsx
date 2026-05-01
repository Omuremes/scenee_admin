import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { actorsService } from '../services/actors';
import type { Actor } from '../services/actors';

export function Actors() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editingActor, setEditingActor] = useState<Actor | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>('');
  const [bio, setBio] = useState('');

  const fetchActors = async () => {
    setIsLoading(true);
    try {
      const response = await actorsService.getActors();
      setActors(response.items || []);
    } catch (err: any) {
      console.error('Failed to fetch actors', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActors();
  }, []);

  useEffect(() => {
    if (editingActor) {
      setFullName(editingActor.full_name);
      setCurrentPhotoUrl(editingActor.photo_url || '');
      setPhotoFile(null);
      setBio(editingActor.bio || '');
    } else {
      setFullName('');
      setCurrentPhotoUrl('');
      setPhotoFile(null);
      setBio('');
    }
  }, [editingActor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingActor) {
        // Edit currently only supports JSON updates for bio/name
        await actorsService.updateActor(editingActor.id, {
          full_name: fullName,
          bio: bio || undefined
        });
      } else {
        // Create supports multipart/form-data
        const formData = new FormData();
        formData.append('full_name', fullName);
        if (bio) formData.append('bio', bio);
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        await actorsService.createActor(formData);
      }

      setIsPanelOpen(false);
      setEditingActor(null);
      fetchActors();
    } catch (err: any) {
      setError(err.message || 'Failed to save actor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (actor: Actor) => {
    setEditingActor(actor);
    setIsPanelOpen(true);
  };

  const handleDelete = async (actor: Actor) => {
    if (!window.confirm(`Are you sure you want to delete ${actor.full_name}?`)) {
      return;
    }
    
    try {
      await actorsService.deleteActor(actor.id);
      fetchActors();
    } catch (err: any) {
      alert(err.message || 'Failed to delete actor');
    }
  };

  const openCreatePanel = () => {
    setEditingActor(null);
    setIsPanelOpen(true);
  };

  const columns: Column<Actor>[] = [
    { key: 'full_name', header: 'Full Name' },
    { 
      key: 'photo_url', 
      header: 'Photo', 
      render: (item) => item.photo_url ? (
        <img src={item.photo_url} alt={item.full_name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
      ) : 'No photo'
    },
    { key: 'bio', header: 'Bio', render: (item) => item.bio ? `${item.bio.substring(0, 50)}...` : '-' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Edit Actor"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
            title="Delete Actor"
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
        title="Actors" 
        subtitle="Manage the actor database"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add Actor
          </Button>
        }
      />

      <DataTable 
        data={actors} 
        columns={columns} 
        keyExtractor={(item) => item.id} 
        isLoading={isLoading}
      />

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        title={editingActor ? "Edit Actor" : "Add New Actor"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
          
          <TextField 
            label="Full Name" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. Leonardo DiCaprio"
          />
          
          <ImageUpload 
            label="Actor Photo"
            onFileSelect={setPhotoFile}
            currentImageUrl={currentPhotoUrl}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                minHeight: '100px',
                fontFamily: 'inherit',
                fontSize: '0.875rem'
              }}
              placeholder="Short biography..."
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingActor ? 'Save Changes' : 'Create Actor')}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
