import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "../../components/form/FormField";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { moviesApi, isApiError } from "../../lib/api";
import { getCategoryRegistry, subscribeCategoryRegistry, upsertCategories } from "../../lib/categoryRegistry";

const schema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  slug: z.string().trim().optional(),
});

type CategoryValues = z.infer<typeof schema>;

export function CategoriesPage() {
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [registry, setRegistry] = useState(getCategoryRegistry);
  const form = useForm<CategoryValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  useEffect(() => subscribeCategoryRegistry(() => setRegistry(getCategoryRegistry())), []);

  const createMutation = useMutation({
    mutationFn: (values: CategoryValues) => moviesApi.createCategory({ name: values.name, slug: values.slug || undefined }),
    onSuccess: (category) => {
      upsertCategories([category], "created");
      pushToast("success", `Category created as ${category.slug}.`);
      form.reset({ name: "", slug: "" });
      setServerError(null);
    },
  });

  async function onSubmit(values: CategoryValues) {
    setServerError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to create category");
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Categories</p>
          <h2>Category registry</h2>
        </div>
      </div>
      <div className="split-layout">
        <div className="panel panel--accent">
          <h3>Create category</h3>
          <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <input className="input" {...form.register("name")} />
            </FormField>
            <FormField label="Slug override" hint="Optional. Backend will normalize the slug if omitted." error={form.formState.errors.slug?.message}>
              <input className="input" {...form.register("slug")} />
            </FormField>
            {serverError ? <div className="alert alert--error">{serverError}</div> : null}
            <button className="button" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create category"}
            </button>
          </form>
        </div>
        <div className="panel">
          <div className="panel__header">
            <h3>Discovered categories</h3>
            <span className="muted">{registry.length} cached locally</span>
          </div>
          {registry.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Source</th>
                  <th>UUID</th>
                </tr>
              </thead>
              <tbody>
                {registry.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.source}</td>
                    <td className="monospace">{category.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <StatusView title="No categories cached yet" detail="They will appear here after category creation or when movie payloads expose them." />
          )}
        </div>
      </div>
    </section>
  );
}
