import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { ImageUpload } from '../components/ImageUpload/ImageUpload';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { moviesService } from '../services/movies';
import type { Movie } from '../services/movies';

export function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [currentPosterUrl, setCurrentPosterUrl] = useState<string>('');

  const fetchMovies = async () => {
    setIsLoading(true);
    try {
      const response = await moviesService.getMovies();
      setMovies(response.items || []);
    } catch (err: any) {
      console.error('Failed to fetch movies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (editingMovie) {
      setName(editingMovie.name);
      setDescription(editingMovie.description || '');
      setDurationMinutes(editingMovie.duration_minutes?.toString() || '');
      setCurrentPosterUrl(editingMovie.poster_url || '');
      setPosterFile(null);
    } else {
      setName('');
      setDescription('');
      setDurationMinutes('');
      setCurrentPosterUrl('');
      setPosterFile(null);
    }
  }, [editingMovie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data = { 
        name, 
        description: description || undefined,
        is_series: false,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      };

      let savedMovie: Movie;
      if (editingMovie) {
        savedMovie = await moviesService.updateMovie(editingMovie.id, data);
      } else {
        savedMovie = await moviesService.createMovie(data);
      }

      // If a file is selected, upload it sequentially via the dedicated endpoint
      if (posterFile) {
        await moviesService.uploadMoviePoster(savedMovie.id, posterFile);
      }

      setIsPanelOpen(false);
      setEditingMovie(null);
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'Failed to save movie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setIsPanelOpen(true);
  };

  const handleDelete = async (movie: Movie) => {
    if (!window.confirm(`Are you sure you want to delete "${movie.name}"?`)) {
      return;
    }
    
    try {
      await moviesService.deleteMovie(movie.id);
      fetchMovies();
    } catch (err: any) {
      alert(err.message || 'Failed to delete movie');
    }
  };

  const openCreatePanel = () => {
    setEditingMovie(null);
    setIsPanelOpen(true);
  };

  const columns: Column<Movie>[] = [
    { key: 'name', header: 'Title' },
    { key: 'duration_minutes', header: 'Duration (m)', render: (item) => item.duration_minutes || '-' },
    { key: 'average_rating', header: 'Rating', render: (item) => item.average_rating.toFixed(1) },
    { key: 'description', header: 'Description', render: (item) => item.description ? `${item.description.substring(0, 50)}...` : '-' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Edit Movie"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
            title="Delete Movie"
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
        title="Movies" 
        subtitle="Manage standalone movies in the catalog"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add Movie
          </Button>
        }
      />

      <DataTable 
        data={movies} 
        columns={columns} 
        keyExtractor={(item) => item.id} 
        isLoading={isLoading}
      />

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        title={editingMovie ? "Edit Movie" : "Add New Movie"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
          
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
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="120"
          />

          <ImageUpload 
            label="Movie Poster"
            onFileSelect={setPosterFile}
            currentImageUrl={currentPosterUrl}
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
              placeholder="Movie description..."
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingMovie ? 'Save Changes' : 'Create Movie')}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
