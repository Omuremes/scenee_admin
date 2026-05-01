import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Pagination } from '../components/Pagination/Pagination';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { actorsService } from '../services/actors';
import type { Actor } from '../services/actors';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PAGE_SIZE = 20;

export function Actors() {
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<Actor[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editing, setEditing] = useState<Actor | null>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await actorsService.getActors({
        query: search || undefined,
        offset,
        limit: PAGE_SIZE,
      });
      setItems(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch actors');
    } finally {
      setIsLoading(false);
    }
  }, [search, offset, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const openCreatePanel = () => {
    setEditing(null);
    setFullName('');
    setBio('');
    setPhotoFile(null);
    setPhotoUrl('');
    setCurrentPhotoUrl('');
    setIsPanelOpen(true);
  };

  const handleEdit = (actor: Actor) => {
    setEditing(actor);
    setFullName(actor.full_name);
    setBio(actor.bio || '');
    setPhotoFile(null);
    setPhotoUrl(actor.photo_url || '');
    setCurrentPhotoUrl(actor.photo_url || '');
    setIsPanelOpen(true);
  };

  const handleDelete = async (actor: Actor) => {
    const ok = await confirm({
      title: 'Delete actor',
      message: `Delete ${actor.full_name}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await actorsService.deleteActor(actor.id);
      toast.success('Actor deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete actor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await actorsService.updateActor(editing.id, {
          full_name: fullName,
          bio: bio || undefined,
          photo_url: photoUrl ? photoUrl : undefined,
        });
      } else {
        const formData = new FormData();
        formData.append('full_name', fullName);
        if (bio) formData.append('bio', bio);
        if (photoFile) {
          formData.append('photo', photoFile);
        } else if (photoUrl) {
          formData.append('photo', photoUrl);
        }
        await actorsService.createActor(formData);
      }
      toast.success(editing ? 'Actor updated' : 'Actor created');
      setIsPanelOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save actor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Actor>[] = [
    {
      key: 'photo_url',
      header: 'Photo',
      render: (item) =>
        item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.full_name}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
        ),
    },
    { key: 'full_name', header: 'Full name' },
    {
      key: 'bio',
      header: 'Bio',
      render: (item) =>
        item.bio ? (item.bio.length > 80 ? `${item.bio.substring(0, 80)}…` : item.bio) : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
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
        title="Actors"
        subtitle="Manage the actor database"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add actor
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search actors..." />
      </Toolbar>

      <DataTable data={items} columns={columns} keyExtractor={(a) => a.id} isLoading={isLoading} />
      <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={editing ? 'Edit actor' : 'Add new actor'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. Leonardo DiCaprio"
          />

          {!editing && (
            <ImageUpload
              label="Photo"
              onFileSelect={setPhotoFile}
              currentImageUrl={currentPhotoUrl}
            />
          )}

          <TextField
            label={editing ? 'Photo URL' : 'Photo URL (used if no file selected)'}
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
          {editing && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '-0.5rem' }}>
              Backend supports only URL replacement on edit. Upload a new file by deleting and recreating the actor.
            </p>
          )}

          <TextArea
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short biography..."
          />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create actor'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
