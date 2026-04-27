import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export function MovieEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [isDraggingPoster, setIsDraggingPoster] = useState(false);
  const [actorSearch, setActorSearch] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [showAdvancedCategories, setShowAdvancedCategories] = useState(false);
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
    if (!movieQuery.data) {
      return;
    }
    form.reset(toFormValues(movieQuery.data));
    upsertCategories(movieQuery.data.categories, "discovered");
    setKnownActors((current) => {
      const map = new Map(current.map((actor) => [actor.id, actor]));
      movieQuery.data.actors.forEach((actor) => map.set(actor.id, actor));
      return Array.from(map.values());
    });
  }, [form, movieQuery.data]);

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
  const selectedActorIds = values.actors;
  const selectedCategoryIds = values.categories;
  const isSeries = values.isSeries;

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

  if (mode === "edit" && movieQuery.isLoading) {
    return <StatusView title="Loading title" detail="Fetching full movie detail for the editor." />;
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
      setServerError("Movies cannot have episodes. Remove episodes or switch this title to a series.");
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
    <section className="page">
      <div className="page__header page__header--editor">
        <div>
          <p className="eyebrow">Admin / Movies</p>
          <h2>{mode === "create" ? "Create title" : "Edit title"}</h2>
          <p className="editor-subtitle">Build a release record in order, with a live preview pinned beside the form.</p>
        </div>
        <Link className="button button--ghost" to="/admin/movies">
          Back to list
        </Link>
      </div>

      {serverError ? <div className="alert alert--error">{serverError}</div> : null}

      <form className="editor-flow" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="editor-flow__main">
          <section className="panel editor-step">
            <div className="editor-step__heading">
              <span className="editor-step__number">Step 1</span>
              <div>
                <h3>Basic Info</h3>
                <p>Give the title a clear identity and make the Movie vs Series choice first.</p>
              </div>
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
                  <p>Single release with one runtime and no episode structure.</p>
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
                  <p>Episodic title with seasons, episodes, and video links.</p>
                </div>
              </button>
            </div>

            <div className="form-grid">
              <FormField label="Name" error={form.formState.errors.name?.message}>
                <input className="input" placeholder="Arrival" {...form.register("name")} />
              </FormField>
              <FormField label="Duration (minutes)" error={form.formState.errors.duration?.message}>
                <input className="input" type="number" min="1" placeholder="116" {...form.register("duration", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Seasons count" hint="Mainly for series; backend keeps this compatible with episode rows." error={form.formState.errors.seasonsCount?.message}>
                <input className="input" type="number" min="1" placeholder="1" {...form.register("seasonsCount", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Structure">
                <div className="editor-statbox">
                  <strong>{isSeries ? "Series" : "Movie"}</strong>
                  <span>{isSeries ? `${values.episodes.length} episode rows configured` : "No episode structure required"}</span>
                </div>
              </FormField>
            </div>

            <FormField label="Description" error={form.formState.errors.description?.message}>
              <textarea className="textarea" rows={6} placeholder="Add synopsis, positioning, or admin notes..." {...form.register("description")} />
            </FormField>
          </section>

          <section className="panel editor-step">
            <div className="editor-step__heading">
              <span className="editor-step__number">Step 2</span>
              <div>
                <h3>Media</h3>
                <p>Upload by drag-and-drop or keep using the existing poster URL.</p>
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
                <span>Uploading a file switches the request to multipart and replaces the current primary poster.</span>
              </label>

              <div className="editor-media-stack">
                <FormField label="Poster URL" error={form.formState.errors.posterUrl?.message}>
                  <input className="input" placeholder="https://cdn.example.com/poster.jpg" {...form.register("posterUrl")} />
                </FormField>

                <div className="editor-current-poster">
                  <span className="editor-current-poster__label">Current poster</span>
                  {posterPreview ? <img src={posterPreview} alt="Current poster preview" /> : <div className="editor-current-poster__empty">No poster selected</div>}
                </div>
              </div>
            </div>
          </section>

          <section className="panel editor-step">
            <div className="editor-step__heading">
              <span className="editor-step__number">Step 3</span>
              <div>
                <h3>People & Tags</h3>
                <p>Attach actors and categories with quick picks and keep advanced tools tucked away.</p>
              </div>
            </div>

            <div className="editor-relations-grid">
              <div className="editor-relation-block">
                <FormField label="Search actors" hint="Uses the public actor list endpoint for async lookup.">
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
              </div>

              <div className="editor-relation-block">
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

                <button type="button" className="button button--ghost editor-advanced-toggle" onClick={() => setShowAdvancedCategories((current) => !current)}>
                  {showAdvancedCategories ? "Hide advanced category tools" : "Show advanced category tools"}
                </button>

                {showAdvancedCategories ? (
                  <div className="editor-advanced-panel">
                    <FormField label="Manual category UUID">
                      <input className="input monospace" placeholder="Paste category UUID" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} />
                    </FormField>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => {
                        const normalized = categoryDraft.trim();
                        if (!normalized) {
                          return;
                        }
                        form.setValue("categories", Array.from(new Set([...selectedCategoryIds, normalized])), { shouldDirty: true });
                        setCategoryDraft("");
                      }}
                    >
                      Add UUID
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className={`editor-episodes-wrap${isSeries ? " editor-episodes-wrap--open" : ""}`}>
            <section className="panel editor-step">
              <div className="editor-step__heading">
                <span className="editor-step__number">Step 4</span>
                <div>
                  <h3>Episodes</h3>
                  <p>Only shown for series, grouped visually by season.</p>
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
                            {form.formState.errors.episodes?.[item.index]?.season_number?.message ? (
                              <span className="field__error">{form.formState.errors.episodes[item.index]?.season_number?.message}</span>
                            ) : null}
                          </div>
                          <div className="episodes-table-cell">
                            <input className="input" type="number" min="1" {...form.register(`episodes.${item.index}.episode_number`, { valueAsNumber: true })} />
                            {form.formState.errors.episodes?.[item.index]?.episode_number?.message ? (
                              <span className="field__error">{form.formState.errors.episodes[item.index]?.episode_number?.message}</span>
                            ) : null}
                          </div>
                          <div className="episodes-table-cell">
                            <input className="input" placeholder="Pilot" {...form.register(`episodes.${item.index}.title`)} />
                            {form.formState.errors.episodes?.[item.index]?.title?.message ? (
                              <span className="field__error">{form.formState.errors.episodes[item.index]?.title?.message}</span>
                            ) : null}
                          </div>
                          <div className="episodes-table-cell">
                            <input className="input" placeholder="https://..." {...form.register(`episodes.${item.index}.video_url`)} />
                            {form.formState.errors.episodes?.[item.index]?.video_url?.message ? (
                              <span className="field__error">{form.formState.errors.episodes[item.index]?.video_url?.message}</span>
                            ) : null}
                          </div>
                          <div className="episodes-table-cell">
                            <input className="input" type="number" min="0" placeholder="45" {...form.register(`episodes.${item.index}.duration`, { valueAsNumber: true })} />
                            {form.formState.errors.episodes?.[item.index]?.duration?.message ? (
                              <span className="field__error">{form.formState.errors.episodes[item.index]?.duration?.message}</span>
                            ) : null}
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
                <StatusView title="No episodes added" detail="Add the first episode row to start building the series structure." />
              )}
            </section>
          </div>
        </div>

        <aside className="editor-flow__side">
          <div className="panel editor-preview-card">
            <div className="editor-preview-card__media">
              {posterPreview ? <img src={posterPreview} alt="Poster preview" /> : <div className="editor-preview-card__empty">No poster preview</div>}
            </div>
            <div className="editor-preview-card__body">
              <span className={`editor-preview-badge${isSeries ? " editor-preview-badge--series" : ""}`}>{isSeries ? "Series" : "Movie"}</span>
              <h3>{values.name.trim() || "Untitled release"}</h3>
              <p>{values.description.trim() || "Description preview appears here as the synopsis is filled in."}</p>
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
        </aside>

        <div className="editor-fixed-save">
          <div className="editor-fixed-save__inner">
            <div className="editor-fixed-save__summary">
              <strong>{values.name.trim() || "Untitled release"}</strong>
              <span>{isSeries ? `${values.episodes.length} episodes configured` : "Movie ready to publish"}</span>
            </div>
            <div className="button-row">
              <Link className="button button--ghost" to="/admin/movies">
                Cancel
              </Link>
              <button className="button" type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : mode === "create" ? "Create title" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
