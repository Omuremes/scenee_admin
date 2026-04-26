import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Pagination } from "../../components/Pagination";
import { StatusView } from "../../components/StatusView";
import { FormField } from "../../components/form/FormField";
import { useToast } from "../../components/ToastProvider";
import { actorsApi, isApiError } from "../../lib/api";
import { Actor } from "../../types/api";

const schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  photoUrl: z.string().trim().optional(),
  bio: z.string().optional(),
});

type ActorValues = z.infer<typeof schema>;

const LIMIT = 12;

function toFormValues(actor?: Actor | null): ActorValues {
  return {
    fullName: actor?.full_name ?? "",
    photoUrl: actor?.photo_url ?? "",
    bio: actor?.bio ?? "",
  };
}

export function ActorsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const actorsQuery = useQuery({
    queryKey: ["actors", { query, offset }],
    queryFn: () => actorsApi.list({ query, offset, limit: LIMIT }),
  });

  const form = useForm<ActorValues>({
    resolver: zodResolver(schema),
    values: useMemo(() => toFormValues(selectedActor), [selectedActor]),
  });

  const createMutation = useMutation({
    mutationFn: (values: ActorValues) =>
      actorsApi.create({
        full_name: values.fullName,
        photo_url: values.photoUrl || null,
        bio: values.bio || null,
      }),
    onSuccess: () => {
      pushToast("success", "Actor created.");
      setServerError(null);
      form.reset(toFormValues(null));
      queryClient.invalidateQueries({ queryKey: ["actors"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ActorValues) =>
      actorsApi.update(selectedActor!.id, {
        full_name: values.fullName,
        photo_url: values.photoUrl || null,
        bio: values.bio || null,
      }),
    onSuccess: (actor) => {
      pushToast("success", "Actor updated.");
      setSelectedActor(actor);
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["actors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (actorId: string) => actorsApi.remove(actorId),
    onSuccess: () => {
      pushToast("success", "Actor deleted.");
      setSelectedActor(null);
      form.reset(toFormValues(null));
      queryClient.invalidateQueries({ queryKey: ["actors"] });
    },
  });

  async function onSubmit(values: ActorValues) {
    setServerError(null);
    try {
      if (selectedActor) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to save actor");
    }
  }

  if (actorsQuery.isLoading) {
    return <StatusView title="Loading actors" detail="Fetching paginated cast inventory." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Actors</p>
          <h2>Actor registry</h2>
        </div>
      </div>
      <div className="split-layout">
        <div className="panel">
          <div className="toolbar">
            <input className="input" placeholder="Search actor name" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="button" className="button button--ghost" onClick={() => setOffset(0)}>
              Apply
            </button>
          </div>
          {actorsQuery.data?.items.length ? (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Photo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {actorsQuery.data.items.map((actor) => (
                    <tr key={actor.id}>
                      <td>{actor.full_name}</td>
                      <td>{actor.photo_url ? "URL set" : "—"}</td>
                      <td>
                        <button type="button" className="button button--ghost" onClick={() => setSelectedActor(actor)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                offset={actorsQuery.data.offset}
                limit={actorsQuery.data.limit}
                total={actorsQuery.data.total}
                onChange={setOffset}
              />
            </>
          ) : (
            <StatusView title="No actors found" detail="Try a different query or create the first actor record." />
          )}
        </div>
        <div className="panel panel--accent">
          <div className="panel__header">
            <h3>{selectedActor ? "Edit actor" : "Create actor"}</h3>
            {selectedActor ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setSelectedActor(null);
                  form.reset(toFormValues(null));
                }}
              >
                New form
              </button>
            ) : null}
          </div>
          <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField label="Full name" error={form.formState.errors.fullName?.message}>
              <input className="input" {...form.register("fullName")} />
            </FormField>
            <FormField label="Photo URL" error={form.formState.errors.photoUrl?.message}>
              <input className="input" {...form.register("photoUrl")} />
            </FormField>
            <FormField label="Bio" error={form.formState.errors.bio?.message}>
              <textarea className="textarea" rows={6} {...form.register("bio")} />
            </FormField>
            {serverError ? <div className="alert alert--error">{serverError}</div> : null}
            <div className="button-row">
              <button className="button" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedActor ? "Save actor" : "Create actor"}
              </button>
              {selectedActor ? (
                <button
                  type="button"
                  className="button button--danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this actor?")) {
                      void deleteMutation.mutateAsync(selectedActor.id);
                    }
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
