import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Pagination } from "../../components/Pagination";
import { StatusView } from "../../components/StatusView";
import { FormField } from "../../components/form/FormField";
import { useToast } from "../../components/ToastProvider";
import { actorsApi, isApiError } from "../../lib/api";
import { Actor } from "../../types/api";

const schema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  bio: z.string().optional(),
});

type ActorValues = z.infer<typeof schema>;

const LIMIT = 12;
const BIO_PREVIEW_LIMIT = 120;

function toFormValues(actor?: Actor | null): ActorValues {
  return {
    fullName: actor?.full_name ?? "",
    bio: actor?.bio ?? "",
  };
}

function truncateBio(bio: string | null) {
  if (!bio?.trim()) {
    return "—";
  }
  const normalized = bio.replace(/\s+/g, " ").trim();
  return normalized.length > BIO_PREVIEW_LIMIT ? `${normalized.slice(0, BIO_PREVIEW_LIMIT).trimEnd()}...` : normalized;
}

export function ActorsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const actorsQuery = useQuery({
    queryKey: ["actors", { query: appliedQuery, offset }],
    queryFn: () => actorsApi.list({ query: appliedQuery, offset, limit: LIMIT }),
  });

  const form = useForm<ActorValues>({
    resolver: zodResolver(schema),
    values: useMemo(() => toFormValues(selectedActor), [selectedActor]),
  });
  const previewName = form.watch("fullName") ?? "";
  const previewBio = form.watch("bio") ?? "";

  useEffect(() => {
    if (!isModalOpen) {
      setPhotoFile(null);
      setPhotoPreview("");
      setServerError(null);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (photoFile) {
      const objectUrl = URL.createObjectURL(photoFile);
      setPhotoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPhotoPreview(selectedActor?.photo_url ?? "");
    return undefined;
  }, [photoFile, selectedActor]);

  function openCreateModal() {
    setSelectedActor(null);
    form.reset(toFormValues(null));
    setPhotoFile(null);
    setServerError(null);
    setIsModalOpen(true);
  }

  function openEditModal(actor: Actor) {
    setSelectedActor(actor);
    form.reset(toFormValues(actor));
    setPhotoFile(null);
    setServerError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  const createMutation = useMutation({
    mutationFn: (values: ActorValues) => {
      const body = new FormData();
      body.append("full_name", values.fullName);
      body.append("bio", values.bio?.trim() || "");
      if (photoFile) {
        body.append("photo", photoFile);
      }
      return actorsApi.create(body);
    },
    onSuccess: () => {
      pushToast("success", "Actor created.");
      queryClient.invalidateQueries({ queryKey: ["actors"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ActorValues) => {
      const body = new FormData();
      body.append("full_name", values.fullName);
      body.append("bio", values.bio?.trim() || "");
      if (photoFile) {
        body.append("photo", photoFile);
      }
      return actorsApi.update(selectedActor!.id, body);
    },
    onSuccess: () => {
      pushToast("success", "Actor updated.");
      queryClient.invalidateQueries({ queryKey: ["actors"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (actorId: string) => actorsApi.remove(actorId),
    onSuccess: () => {
      pushToast("success", "Actor deleted.");
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

  function handleApplySearch() {
    setOffset(0);
    setAppliedQuery(searchInput.trim());
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

      <section className="panel">
        <div className="toolbar toolbar--wide">
          <input
            className="input actors-search"
            placeholder="Search actor name"
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

        {actorsQuery.data?.items.length ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Bio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {actorsQuery.data.items.map((actor) => (
                  <tr key={actor.id}>
                    <td>{actor.full_name}</td>
                    <td className="table-cell-clip" title={actor.bio ?? ""}>
                      {truncateBio(actor.bio)}
                    </td>
                    <td className="actions-cell">
                      <div className="button-row actors-actions">
                        <button type="button" className="button button--ghost" onClick={() => openEditModal(actor)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--danger"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete ${actor.full_name}?`)) {
                              void deleteMutation.mutateAsync(actor.id);
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
              offset={actorsQuery.data.offset}
              limit={actorsQuery.data.limit}
              total={actorsQuery.data.total}
              onChange={setOffset}
            />
          </>
        ) : (
          <StatusView title="No actors found" detail="Try a different query or add the first actor record." />
        )}
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-card modal-card--actor panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="actor-modal-title"
          >
            <div className="panel__header">
              <h3 id="actor-modal-title">{selectedActor ? "Edit actor" : "Add actor"}</h3>
              <button type="button" className="button button--ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="actor-modal-layout">
              <form className="stack-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField label="Name" error={form.formState.errors.fullName?.message}>
                  <input className="input" {...form.register("fullName")} />
                </FormField>

                <FormField
                  label="Photo Upload"
                  hint={selectedActor && !photoFile ? "Leave empty to keep the current photo." : undefined}
                >
                  <input
                    className="input input--file"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  />
                </FormField>

                <FormField label="Bio" error={form.formState.errors.bio?.message}>
                  <textarea className="textarea" rows={6} {...form.register("bio")} />
                </FormField>

                {serverError ? <div className="alert alert--error">{serverError}</div> : null}

                <div className="button-row">
                  <button className="button" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : selectedActor ? "Save actor" : "Create actor"}
                  </button>
                </div>
              </form>

              <aside className="actor-modal-preview">
                <div className="panel editor-preview-card">
                  <div className="editor-preview-card__media">
                    {photoPreview ? <img src={photoPreview} alt="Actor preview" /> : <div className="editor-preview-card__empty">No photo preview</div>}
                  </div>
                  <div className="editor-preview-card__body">
                    <span className="editor-preview-badge">Actor</span>
                    <h3>{previewName.trim() || "Unnamed actor"}</h3>
                    <p>{previewBio.trim() || "Actor bio preview appears here."}</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
