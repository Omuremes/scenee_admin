import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { Button } from '../components/Button/Button';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TextField } from '../components/TextField/TextField';
import { SearchInput } from '../components/SearchInput/SearchInput';
import { Pagination } from '../components/Pagination/Pagination';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { eventCategoriesService } from '../services/events';
import type { EventCategory } from '../services/events';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { slugify } from '../utils/slugify';

const PAGE_SIZE = 20;

export function EventCategories() {
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<EventCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editing, setEditing] = useState<EventCategory | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await eventCategoriesService.getCategories({
        query: search || undefined,
        offset,
        limit: PAGE_SIZE,
      });
      setItems(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch categories');
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
    setName('');
    setSlug('');
    setSlugTouched(false);
    setIsPanelOpen(true);
  };

  const handleEdit = (category: EventCategory) => {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug || '');
    setSlugTouched(true);
    setIsPanelOpen(true);
  };

  const handleDelete = async (category: EventCategory) => {
    const ok = await confirm({
      title: 'Delete category',
      message: `Delete category "${category.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await eventCategoriesService.deleteCategory(category.id);
      toast.success('Category deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { name, slug: slug || undefined };
      if (editing) {
        await eventCategoriesService.updateCategory(editing.id, payload);
      } else {
        await eventCategoriesService.createCategory(payload);
      }
      toast.success(editing ? 'Category updated' : 'Category created');
      setIsPanelOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<EventCategory>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
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
        title="Event categories"
        subtitle="Categorize your events for filtering"
        action={
          <Button onClick={openCreatePanel}>
            <Plus size={16} /> Add category
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." />
      </Toolbar>

      <DataTable data={items} columns={columns} keyExtractor={(c) => c.id} isLoading={isLoading} />
      <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={editing ? 'Edit category' : 'Add new category'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="e.g. Concert"
          />
          <TextField
            label="Slug (optional)"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="e.g. concert"
          />
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
