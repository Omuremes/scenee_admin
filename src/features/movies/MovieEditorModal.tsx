import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { FormField } from "../../components/form/FormField";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { actorsApi, isApiError, moviesApi } from "../../lib/api";
import { getCategoryRegistry, subscribeCategoryRegistry, upsertCategories } from "../../lib/categoryRegistry";
import { Actor, MovieDetail, MovieFormValues } from "../../types/api";
import { buildMovieRequestBody } from "./moviePayload";

const episodeSchema = z.object({
  season_number: z.coerce.number().min(1, "Season must be 1 or higher"),
  episode_number: z.coerce.number().min(1, "Episode must be 1 or higher"),
  title: z.string().nullable(),
  description: z.string().nullable(),
  video_url: z.string().nullable(),
  duration: z.coerce.number().nullable(),
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string(),
  isSeries: z.boolean(),
  duration: z.coerce.number().nullable(),
  seasonsCount: z.coerce.number().min(1, "At least one season"),
  posterUrl: z.string(),
  actors: z.array(z.string()),
  categories: z.array(z.string()),
  episodes: z.array(episodeSchema),
});

function toFormValues(movie?: MovieDetail): MovieFormValues {
  return {
    name: movie?.name ?? "",
    description: movie?.description ?? "",
    isSeries: movie?.is_series ?? false,
    duration: movie?.duration ?? null,
    seasonsCount: movie?.seasons_count ?? 1,
    posterUrl: movie?.primary_poster?.url ?? "",
    actors: movie?.actors.map((actor) => actor.id) ?? [],
    categories: movie?.categories.map((category) => category.id) ?? [],
    episodes:
      movie?.episodes.map((episode) => ({
        season_number: episode.season_number,
        episode_number: episode.episode_number,
        title: episode.title,
        description: episode.description,
        video_url: episode.video_url,
        duration: episode.duration,
      })) ?? [],
  };
}

type GroupedEpisode = {
  seasonNumber: number;
  items: Array<{ index: number; id: string }>;
};

export function MovieEditorModal({ mode, movieId }: { mode: "create" | "edit"; movieId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [isDraggingPoster, setIsDraggingPoster] = useState(false);
  const [actorSearch, setActorSearch] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [registry, setRegistry] = useState(getCategoryRegistry);
  const [knownActors, setKnownActors] = useState<Actor[]>([]);

  useEffect(() => subscribeCategoryRegistry(() => setRegistry(getCategoryRegistry())), []);

  const movieQuery = useQuery({
    queryKey: ["movie", movieId],
    queryFn: () => moviesApi.get(movieId!),
    enabled: mode === "edit" && Boolean(movieId),
  });

  const actorSearchQuery = useQuery({
    queryKey: ["actor-search", actorSearch],
    queryFn: () => actorsApi.list({ query: actorSearch, offset: 0, limit: 8 }),
    enabled: actorSearch.trim().length > 1,
  });

  const form = useForm<MovieFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "episodes" });

  useEffect(() => {
    if (mode === "create") {
      form.reset(toFormValues());
      setPosterFile(null);
      setActorSearch("");
      setServerError(null);
      return;
    }

    if (!movieQuery.data) {
      return;
    }

    form.reset(toFormValues(movieQuery.data));
    setPosterFile(null);
    setActorSearch("");
    setServerError(null);
    upsertCategories(movieQuery.data.categories, "discovered");
    setKnownActors((current) => {
      const map = new Map(current.map((actor) => [actor.id, actor]));
      movieQuery.data.actors.forEach((actor) => map.set(actor.id, actor));
      return Array.from(map.values());
    });
  }, [form, mode, movieQuery.data]);

  useEffect(() => {
    if (!actorSearchQuery.data?.items) {
      return;
    }
    setKnownActors((current) => {
      const map = new Map(current.map((actor) => [actor.id, actor]));
      actorSearchQuery.data.items.forEach((actor) => map.set(actor.id, actor));
      return Array.from(map.values());
    });
  }, [actorSearchQuery.data]);

  const values = form.watch();
  const isSeries = values.isSeries;
  const selectedActorIds = values.actors;
  const selectedCategoryIds = values.categories;

  useEffect(() => {
    if (!isSeries && values.episodes.length > 0) {
      form.setValue("episodes", [], { shouldDirty: true });
      form.setValue("seasonsCount", 1, { shouldDirty: true });
    }
  }, [form, isSeries, values.episodes.length]);

  const actorMap = useMemo(() => new Map(knownActors.map((actor) => [actor.id, actor])), [knownActors]);
  const categoryMap = useMemo(() => new Map(registry.map((category) => [category.id, category])), [registry]);
  const selectedCategories = selectedCategoryIds
    .map((categoryId) => categoryMap.get(categoryId))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  const groupedEpisodes = useMemo<GroupedEpisode[]>(() => {
    const grouped = new Map<number, Array<{ index: number; id: string }>>();
    fields.forEach((field, index) => {
      const seasonNumber = Number(values.episodes[index]?.season_number) || 1;
      const bucket = grouped.get(seasonNumber) ?? [];
      bucket.push({ index, id: field.id });
      grouped.set(seasonNumber, bucket);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([seasonNumber, items]) => ({ seasonNumber, items }));
  }, [fields, values.episodes]);

  useEffect(() => {
    if (posterFile) {
      const objectUrl = URL.createObjectURL(posterFile);
      setPosterPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPosterPreview(values.posterUrl.trim());
    return undefined;
  }, [posterFile, values.posterUrl]);

  const saveMutation = useMutation({
    mutationFn: (formValues: MovieFormValues) => {
      const body = buildMovieRequestBody(formValues, posterFile);
      return mode === "create" ? moviesApi.create(body) : moviesApi.update(movieId!, body);
    },
    onSuccess: (movie) => {
      pushToast("success", mode === "create" ? "Title created." : "Title updated.");
      upsertCategories(movie.categories, "discovered");
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["movie", movie.id] });
      navigate("/admin/movies");
    },
  });

  function closeModal() {
    navigate("/admin/movies");
  }

  function handlePosterSelect(file: File | null) {
    setPosterFile(file);
  }

  function handlePosterDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingPoster(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      handlePosterSelect(file);
    }
  }

  async function onSubmit(formValues: MovieFormValues) {
    setServerError(null);
    const hasEpisodes = formValues.episodes.length > 0;
    const existingHasEpisodes = Boolean(movieQuery.data?.episodes.length);

    if (!formValues.isSeries && hasEpisodes) {
      setServerError("Movies cannot have episodes.");
      return;
    }

    if (mode === "edit" && movieQuery.data?.is_series && !formValues.isSeries && existingHasEpisodes) {
      setServerError("Cannot convert a series to a movie while episodes still exist.");
      return;
    }

    try {
      await saveMutation.mutateAsync(formValues);
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to save title");
    }
  }

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal-card modal-card--wide panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Admin / Movies</p>
            <h3>{mode === "create" ? "Create title" : "Edit title"}</h3>
          </div>
          <button type="button" className="button button--ghost" onClick={closeModal}>
            Close
          </button>
        </div>

        {mode === "edit" && movieQuery.isLoading ? (
          <StatusView title="Loading title" detail="Fetching full movie detail for the editor." />
        ) : (
          <form className="editor-modal-form" onSubmit={form.handleSubmit(onSubmit)}>
            {serverError ? <div className="alert alert--error">{serverError}</div> : null}

            <div className="editor-modal-grid">
              <div className="editor-modal-main">
                <section className="panel editor-step">
                  <div className="editor-step__heading">
                    <span className="editor-step__number">Type</span>
                  </div>
                  <div className="editor-type-grid">
                    <button
                      type="button"
                      className={`editor-type-card${!isSeries ? " editor-type-card--active" : ""}`}
                      onClick={() => form.setValue("isSeries", false, { shouldDirty: true })}
                    >
                      <div className="editor-type-card__icon">M</div>
                      <div>
                        <strong>Movie</strong>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`editor-type-card${isSeries ? " editor-type-card--active" : ""}`}
                      onClick={() => form.setValue("isSeries", true, { shouldDirty: true })}
                    >
                      <div className="editor-type-card__icon">S</div>
                      <div>
                        <strong>Series</strong>
                      </div>
                    </button>
                  </div>
                </section>

                <section className="panel editor-step">
                  <div className="editor-step__heading">
                    <span className="editor-step__number">Info</span>

                  </div>
                  <div className="form-grid">
                    <FormField label="Name" error={form.formState.errors.name?.message}>
                      <input className="input" placeholder="Arrival" {...form.register("name")} />
                    </FormField>
                    {!isSeries ? (
                      <FormField label="Duration (minutes)" error={form.formState.errors.duration?.message}>
                        <input className="input" type="number" min="1" placeholder="116" {...form.register("duration", { valueAsNumber: true })} />
                      </FormField>
                    ) : null}
                  </div>
                  <FormField label="Description" error={form.formState.errors.description?.message}>
                    <textarea className="textarea" rows={6} placeholder="Synopsis or admin notes..." {...form.register("description")} />
                  </FormField>
                </section>

                {isSeries ? (
                  <section className="panel editor-step">
                    <div className="editor-step__heading">
                      <span className="editor-step__number">Series</span>
                    </div>
                    <div className="form-grid">
                      <FormField label="Seasons count" error={form.formState.errors.seasonsCount?.message}>
                        <input className="input" type="number" min="1" placeholder="1" {...form.register("seasonsCount", { valueAsNumber: true })} />
                      </FormField>
                    </div>
                  </section>
                ) : null}

                <section className="panel editor-step">
                  <div className="editor-step__heading">
                    <span className="editor-step__number">Poster</span>
                    <div>
                      <h3>Poster</h3>
                    </div>
                  </div>
                  <div className="editor-media-layout">
                    <label
                      className={`editor-dropzone${isDraggingPoster ? " editor-dropzone--active" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingPoster(true);
                      }}
                      onDragLeave={() => setIsDraggingPoster(false)}
                      onDrop={handlePosterDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="editor-dropzone__input"
                        onChange={(event) => handlePosterSelect(event.target.files?.[0] ?? null)}
                      />
                      <strong>{posterFile ? posterFile.name : "Drop poster here or click to upload"}</strong>
                    </label>
                  </div>
                </section>

                <section className="panel editor-step">
                  <div className="editor-step__heading">
                    <span className="editor-step__number">Actors</span>
                  </div>
                  <FormField label="Search actors">
                    <input className="input" placeholder="Search cast by name" value={actorSearch} onChange={(event) => setActorSearch(event.target.value)} />
                  </FormField>
                  <div className="editor-chip-label">Selected actors</div>
                  <div className="chip-row">
                    {selectedActorIds.length ? (
                      selectedActorIds.map((actorId) => (
                        <button
                          key={actorId}
                          type="button"
                          className="chip"
                          onClick={() => form.setValue("actors", selectedActorIds.filter((id) => id !== actorId), { shouldDirty: true })}
                        >
                          {actorMap.get(actorId)?.full_name ?? actorId} x
                        </button>
                      ))
                    ) : (
                      <span className="editor-empty-inline">No actors selected yet.</span>
                    )}
                  </div>
                  <div className="picker-list">
                    {actorSearchQuery.data?.items.map((actor) => (
                      <button
                        key={actor.id}
                        type="button"
                        className="picker-item"
                        disabled={selectedActorIds.includes(actor.id)}
                        onClick={() => form.setValue("actors", Array.from(new Set([...selectedActorIds, actor.id])), { shouldDirty: true })}
                      >
                        {actor.full_name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="panel editor-step">
                  <div className="editor-step__heading">
                    <span className="editor-step__number">Categories</span>
                  </div>
                  <div className="editor-chip-label">Selected categories</div>
                  <div className="chip-row">
                    {selectedCategoryIds.length ? (
                      selectedCategoryIds.map((categoryId) => (
                        <button
                          key={categoryId}
                          type="button"
                          className="chip"
                          onClick={() => form.setValue("categories", selectedCategoryIds.filter((id) => id !== categoryId), { shouldDirty: true })}
                        >
                          {categoryMap.get(categoryId)?.name ?? categoryId} x
                        </button>
                      ))
                    ) : (
                      <span className="editor-empty-inline">No categories selected yet.</span>
                    )}
                  </div>
                  <div className="picker-list">
                    {registry.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="picker-item"
                        disabled={selectedCategoryIds.includes(category.id)}
                        onClick={() => form.setValue("categories", Array.from(new Set([...selectedCategoryIds, category.id])), { shouldDirty: true })}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </section>

                {isSeries ? (
                  <section className="panel editor-step">
                    <div className="editor-step__heading">
                      <span className="editor-step__number">Episodes</span>
                      <div>
                        <h3>Episodes</h3>
                        <p>This entire section only exists for series.</p>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() =>
                          append({
                            season_number: 1,
                            episode_number: fields.length + 1,
                            title: "",
                            description: "",
                            video_url: "",
                            duration: null,
                          })
                        }
                      >
                        Add episode
                      </button>
                    </div>

                    {fields.length ? (
                      <div className="episodes-group-stack">
                        {groupedEpisodes.map((group) => (
                          <div key={`season-${group.seasonNumber}`} className="episodes-season-group">
                            <div className="episodes-season-label">Season {group.seasonNumber}</div>
                            <div className="episodes-table-header">
                              <span>Season</span>
                              <span>Episode</span>
                              <span>Title</span>
                              <span>Video URL</span>
                              <span>Duration</span>
                              <span>Remove</span>
                            </div>
                            {group.items.map((item) => (
                              <div key={item.id} className="episodes-table-row">
                                <div className="episodes-table-cell">
                                  <input className="input" type="number" min="1" {...form.register(`episodes.${item.index}.season_number`, { valueAsNumber: true })} />
                                </div>
                                <div className="episodes-table-cell">
                                  <input className="input" type="number" min="1" {...form.register(`episodes.${item.index}.episode_number`, { valueAsNumber: true })} />
                                </div>
                                <div className="episodes-table-cell">
                                  <input className="input" placeholder="Pilot" {...form.register(`episodes.${item.index}.title`)} />
                                </div>
                                <div className="episodes-table-cell">
                                  <input className="input" placeholder="https://..." {...form.register(`episodes.${item.index}.video_url`)} />
                                </div>
                                <div className="episodes-table-cell">
                                  <input className="input" type="number" min="0" placeholder="45" {...form.register(`episodes.${item.index}.duration`, { valueAsNumber: true })} />
                                </div>
                                <div className="episodes-table-cell episodes-table-cell--action">
                                  <button type="button" className="button button--danger" onClick={() => remove(item.index)}>
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <StatusView title="No episodes added" detail="Add the first episode row for this series." />
                    )}
                  </section>
                ) : null}
              </div>

              <aside className="editor-modal-side">
                <div className="panel editor-preview-card">
                  <div className="editor-preview-card__media">
                    {posterPreview ? <img src={posterPreview} alt="Poster preview" /> : <div className="editor-preview-card__empty">No poster preview</div>}
                    {/* {posterPreview ? <img src="http://192.168.68.150:9000/cinescope-media/movies/e5af3365-6c56-42d8-9f74-cb43a9f85ca4.jpg" alt="Poster preview" /> : <div className="editor-preview-card__empty">No poster preview</div>} */}
                  </div>
                  <div className="editor-preview-card__body">
                    <span className={`editor-preview-badge${isSeries ? " editor-preview-badge--series" : ""}`}>{isSeries ? "Series" : "Movie"}</span>
                    <h3>{values.name.trim() || "Untitled release"}</h3>
                    <p>{values.description.trim() || "Description preview appears here."}</p>
                    <div className="editor-preview-chips">
                      {selectedCategories.length ? (
                        selectedCategories.map((category) => (
                          <span key={category.id} className="chip">
                            {category.name}
                          </span>
                        ))
                      ) : (
                        <span className="editor-empty-inline">No categories selected yet.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel editor-modal-actions">
                  <div className="editor-fixed-save__summary">
                    <strong>{values.name.trim() || "Untitled release"}</strong>
                    <span>{isSeries ? `${values.episodes.length} episodes configured` : "Movie ready to publish"}</span>
                  </div>
                  <div className="button-row">
                    <button type="button" className="button button--ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="button" type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create title" : "Save changes"}
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
