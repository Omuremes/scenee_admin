import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Pagination } from '../components/Pagination/Pagination';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { Select } from '../components/Select/Select';
import { MultiSelect } from '../components/MultiSelect/MultiSelect';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { serialsService } from '../services/series';
import type { SerialListItem } from '../services/series';
import { movieCategoriesService } from '../services/movieCategories';
import type { MovieCategory } from '../services/movieCategories';
import { actorsService } from '../services/actors';
import type { Actor } from '../services/actors';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PAGE_SIZE = 20;

export function Series() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [items, setItems] = useState<SerialListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [categories, setCategories] = useState<MovieCategory[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await serialsService.getSerials({
        query: search || undefined,
        category_id: categoryFilter || undefined,
        skip: offset,
        limit: PAGE_SIZE,
      });
      setItems(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch series');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, offset, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [search, categoryFilter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cats, acts] = await Promise.all([
          movieCategoriesService.getMovieCategories({ limit: 100 }),
          actorsService.getActors({ limit: 100 }),
        ]);
        if (!alive) return;
        setCategories(cats.items || []);
        setActors(acts.items || []);
      } catch (err: any) {
        if (alive) toast.error(err.message || 'Failed to load related data');
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const openCreatePanel = () => {
    setName('');
    setDescription('');
    setPosterFile(null);
    setSelectedActors([]);
    setSelectedCategories([]);
    setIsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await serialsService.createSerial({
        name,
        description: description || undefined,
        actors: selectedActors,
        categories: selectedCategories,
      });
      
      if (posterFile) {
        await serialsService.uploadSerialPoster(created.id, posterFile);
      }

      toast.success('Series created');
      setIsPanelOpen(false);
      await fetchData();
      navigate(`/series/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create series');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (serial: SerialListItem) => {
    const ok = await confirm({
      title: 'Delete series',
      message: `Delete "${serial.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await serialsService.deleteSerial(serial.id);
      toast.success('Series deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete series');
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const columns: Column<SerialListItem>[] = [
    {
      key: 'poster_url',
      header: 'Poster',
      render: (item) =>
        item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.name}
            style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
          />
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
        ),
    },
    { key: 'name', header: 'Title' },
    {
      key: 'categories',
      header: 'Categories',
      render: (item) => (item.categories?.length ? item.categories.map((c) => c.name).join(', ') : '—'),
    },
    {
      key: 'average_rating',
      header: 'Rating',
      render: (item) => item.average_rating?.toFixed(1) ?? '0.0',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/series/${item.id}`); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}
            title="Open"
            type="button"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/series/${item.id}`); }}
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
        title="Series"
        subtitle="Manage TV series, seasons and episodes"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add series
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search series..." />
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
        onRowClick={(item) => navigate(`/series/${item.id}`)}
      />
      <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Add new series"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Breaking Bad"
          />
          
          <ImageUpload
            label="Poster"
            onFileSelect={setPosterFile}
          />

          <MultiSelect
            label="Categories"
            value={selectedCategories}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={setSelectedCategories}
          />

          <MultiSelect
            label="Actors"
            value={selectedActors}
            options={actors.map((a) => ({ value: a.id, label: a.full_name }))}
            onChange={setSelectedActors}
          />

          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Series description..."
          />

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
