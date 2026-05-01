import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { movieCategoriesService } from '../services/movieCategories';
import type { MovieCategory } from '../services/movieCategories';

export function MovieCategories() {
  const [categories, setCategories] = useState<MovieCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<MovieCategory | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await movieCategoriesService.getMovieCategories();
      setCategories(response.items || []);
    } catch (err: any) {
      console.error('Failed to fetch movie categories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setSlug(editingCategory.slug || '');
    } else {
      setName('');
      setSlug('');
    }
  }, [editingCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data = { 
        name, 
        slug: slug || undefined
      };

      if (editingCategory) {
        await movieCategoriesService.updateMovieCategory(editingCategory.id, data);
      } else {
        await movieCategoriesService.createMovieCategory(data);
      }

      setIsPanelOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save movie category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: MovieCategory) => {
    setEditingCategory(category);
    setIsPanelOpen(true);
  };

  const handleDelete = async (category: MovieCategory) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      return;
    }
    
    try {
      await movieCategoriesService.deleteMovieCategory(category.id);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete movie category');
    }
  };

  const openCreatePanel = () => {
    setEditingCategory(null);
    setIsPanelOpen(true);
  };

  const columns: Column<MovieCategory>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Edit Category"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
            title="Delete Category"
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
        title="Movie Categories" 
        subtitle="Manage genres and categories for movies"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add Category
          </Button>
        }
      />

      <DataTable 
        data={categories} 
        columns={columns} 
        keyExtractor={(item) => item.id} 
        isLoading={isLoading}
      />

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        title={editingCategory ? "Edit Category" : "Add New Category"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
          
          <TextField 
            label="Name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Science Fiction"
          />

          <TextField 
            label="Slug (optional)" 
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. sci-fi"
          />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingCategory ? 'Save Changes' : 'Create Category')}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
