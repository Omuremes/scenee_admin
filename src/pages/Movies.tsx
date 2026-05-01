import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { MultiSelect } from '../components/MultiSelect/MultiSelect';
import { Pagination } from '../components/Pagination/Pagination';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { Select } from '../components/Select/Select';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { moviesService } from '../services/movies';
import type { MovieDetail, MovieListItem } from '../services/movies';
import { movieCategoriesService } from '../services/movieCategories';
import type { MovieCategory } from '../services/movieCategories';
import { actorsService } from '../services/actors';
import type { Actor } from '../services/actors';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PAGE_SIZE = 20;

export function Movies() {
  const toast = useToast();
  const confirm = useConfirm();

  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [categories, setCategories] = useState<MovieCategory[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingMovie, setEditingMovie] = useState<MovieDetail | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [currentPosterUrl, setCurrentPosterUrl] = useState('');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchMovies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await moviesService.getMovies({
        query: search || undefined,
        category_id: categoryFilter || undefined,
        offset,
        limit: PAGE_SIZE,
      });
      setMovies(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch movies');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, offset, toast]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

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

  const resetForm = () => {
    setName('');
    setDescription('');
    setDuration('');
    setCurrentPosterUrl('');
    setPosterFile(null);
    setSelectedActors([]);
    setSelectedCategories([]);
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const openCreatePanel = () => {
    setEditingMovie(null);
    resetForm();
    setIsPanelOpen(true);
  };

  const handleEdit = async (movie: MovieListItem) => {
    try {
      const detail = await moviesService.getMovie(movie.id);
      setEditingMovie(detail);
      setName(detail.name);
      setDescription(detail.description || '');
      setDuration(detail.duration ? String(detail.duration) : '');
      setCurrentPosterUrl(detail.poster_url || detail.primary_poster?.url || '');
      setPosterFile(null);
      setSelectedActors((detail.actors || []).map((a) => a.id));
      setSelectedCategories((detail.categories || []).map((c) => c.id));
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      setIsPanelOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load movie');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        duration: duration ? Number.parseInt(duration, 10) : undefined,
        actors: selectedActors,
        categories: selectedCategories,
      };
      const saved = editingMovie
        ? await moviesService.updateMovie(editingMovie.id, payload)
        : await moviesService.createMovie(payload);

      if (posterFile) {
        await moviesService.uploadMoviePoster(saved.id, posterFile);
      }
      if (videoFile) {
        await moviesService.uploadMovieVideo(saved.id, videoFile);
      }

      toast.success(editingMovie ? 'Movie updated' : 'Movie created');
      setIsPanelOpen(false);
      setEditingMovie(null);
      resetForm();
      fetchMovies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save movie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (movie: MovieListItem) => {
    const ok = await confirm({
      title: 'Delete movie',
      message: `Delete "${movie.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await moviesService.deleteMovie(movie.id);
      toast.success('Movie deleted');
      fetchMovies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete movie');
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const actorOptions = useMemo(
    () => actors.map((a) => ({ value: a.id, label: a.full_name })),
    [actors],
  );

  const categoryMultiOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const columns: Column<MovieListItem>[] = [
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
    { key: 'duration', header: 'Duration', render: (item) => (item.duration ? `${item.duration} min` : '—') },
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
        title="Movies"
        subtitle="Manage standalone movies in the catalog"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add movie
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search movies..." />
        <Select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categoryOptions}
        />
      </Toolbar>

      <DataTable
        data={movies}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />
      <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={editingMovie ? 'Edit movie' : 'Add new movie'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Inception"
          />

          <TextField
            label="Duration (minutes)"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="120"
          />

          <ImageUpload
            label="Poster"
            onFileSelect={setPosterFile}
            currentImageUrl={currentPosterUrl}
          />

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>
              Video file (mp4 / mkv)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/x-matroska"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                style={{ flex: 1, fontSize: '0.8125rem' }}
              />
              {videoFile && <Upload size={14} />}
            </div>
            {editingMovie?.video_url && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                Current video: <a href={editingMovie.video_url} target="_blank" rel="noreferrer">open</a>
              </div>
            )}
          </div>

          <MultiSelect
            label="Categories"
            value={selectedCategories}
            options={categoryMultiOptions}
            onChange={setSelectedCategories}
            placeholder="Pick categories..."
          />

          <MultiSelect
            label="Actors"
            value={selectedActors}
            options={actorOptions}
            onChange={setSelectedActors}
            placeholder="Pick actors..."
          />

          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Movie description..."
          />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingMovie ? 'Save changes' : 'Create movie'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
