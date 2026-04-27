import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Pagination } from "../../components/Pagination";
import { StatusView } from "../../components/StatusView";
import { FormField } from "../../components/form/FormField";
import { useToast } from "../../components/ToastProvider";
import { moviesApi, isApiError } from "../../lib/api";
import { upsertCategories } from "../../lib/categoryRegistry";
import { MovieCategory } from "../../types/api";

const schema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

type CategoryValues = z.infer<typeof schema>;

const LIMIT = 12;

function toFormValues(category?: MovieCategory | null): CategoryValues {
  return {
    name: category?.name ?? "",
  };
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MovieCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["movie-categories", { query: appliedQuery, offset }],
    queryFn: () => moviesApi.listCategories({ query: appliedQuery, offset, limit: LIMIT }),
  });

  const form = useForm<CategoryValues>({
    resolver: zodResolver(schema),
    values: useMemo(() => toFormValues(selectedCategory), [selectedCategory]),
  });

  useEffect(() => {
    if (!isModalOpen) {
      setServerError(null);
    }
  }, [isModalOpen]);

  function openCreateModal() {
    setSelectedCategory(null);
    form.reset(toFormValues(null));
    setServerError(null);
    setIsModalOpen(true);
  }

  function openEditModal(category: MovieCategory) {
    setSelectedCategory(category);
    form.reset(toFormValues(category));
    setServerError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  const createMutation = useMutation({
    mutationFn: (values: CategoryValues) => moviesApi.createCategory({ name: values.name }),
    onSuccess: (category) => {
      upsertCategories([category], "created");
      pushToast("success", `Category created as ${category.slug}.`);
      queryClient.invalidateQueries({ queryKey: ["movie-categories"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CategoryValues) => moviesApi.updateCategory(selectedCategory!.id, { name: values.name }),
    onSuccess: (category) => {
      upsertCategories([category], "created");
      pushToast("success", "Category updated.");
      queryClient.invalidateQueries({ queryKey: ["movie-categories"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => moviesApi.removeCategory(categoryId),
    onSuccess: () => {
      pushToast("success", "Category deleted.");
      queryClient.invalidateQueries({ queryKey: ["movie-categories"] });
    },
  });

  async function onSubmit(values: CategoryValues) {
    setServerError(null);
    try {
      if (selectedCategory) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to save category");
    }
  }

  function handleApplySearch() {
    setOffset(0);
    setAppliedQuery(searchInput.trim());
  }

  if (categoriesQuery.isLoading) {
    return <StatusView title="Loading categories" detail="Fetching paginated category registry." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Categories</p>
          <h2>Category registry</h2>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar toolbar--wide">
          <input
            className="input actors-search"
            placeholder="Search category name"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleApplySearch();
              }
            }}
          />
          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={handleApplySearch}>
              Apply
            </button>
            <button type="button" className="button" onClick={openCreateModal}>
              Add
            </button>
          </div>
        </div>

        {categoriesQuery.data?.items.length ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>UUID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categoriesQuery.data.items.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td className="monospace">{category.id}</td>
                    <td className="actions-cell">
                      <div className="button-row actors-actions">
                        <button type="button" className="button button--ghost" onClick={() => openEditModal(category)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--danger"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete ${category.name}?`)) {
                              void deleteMutation.mutateAsync(category.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              offset={categoriesQuery.data.offset}
              limit={categoriesQuery.data.limit}
              total={categoriesQuery.data.total}
              onChange={setOffset}
            />
          </>
        ) : (
          <StatusView title="No categories found" detail="Try a different query or add the first category." />
        )}
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-card panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="panel__header">
              <h3 id="category-modal-title">{selectedCategory ? "Edit category" : "Add category"}</h3>
              <button type="button" className="button button--ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField label="Name" error={form.formState.errors.name?.message}>
                <input className="input" {...form.register("name")} />
              </FormField>

              {selectedCategory ? (
                <div className="editor-advanced-panel">
                  <span className="editor-chip-label">Current slug</span>
                  <span className="monospace">{selectedCategory.slug}</span>
                </div>
              ) : null}

              {serverError ? <div className="alert alert--error">{serverError}</div> : null}

              <div className="button-row">
                <button className="button" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : selectedCategory ? "Save category" : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
