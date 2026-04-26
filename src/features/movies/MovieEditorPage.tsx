import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { FormField } from "../../components/form/FormField";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { actorsApi, isApiError, moviesApi } from "../../lib/api";
import { getCategoryRegistry, subscribeCategoryRegistry, upsertCategories } from "../../lib/categoryRegistry";
import { buildMovieRequestBody } from "./moviePayload";
import { Actor, MovieDetail, MovieFormValues } from "../../types/api";

const episodeSchema = z.object({
  season_number: z.coerce.number().min(1),
  episode_number: z.coerce.number().min(1),
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

export function MovieEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [actorSearch, setActorSearch] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
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
      actorSearchQuery.data?.items.forEach((actor) => map.set(actor.id, actor));
      return Array.from(map.values());
    });
  }, [actorSearchQuery.data]);

  const selectedActorIds = form.watch("actors");
  const selectedCategoryIds = form.watch("categories");
  const isSeries = form.watch("isSeries");

  const actorMap = useMemo(() => new Map(knownActors.map((actor) => [actor.id, actor])), [knownActors]);
  const categoryMap = useMemo(() => new Map(registry.map((category) => [category.id, category])), [registry]);

  const saveMutation = useMutation({
    mutationFn: (values: MovieFormValues) => {
      const body = buildMovieRequestBody(values, posterFile);
      return mode === "create" ? moviesApi.create(body) : moviesApi.update(movieId!, body);
    },
    onSuccess: (movie) => {
      pushToast("success", mode === "create" ? "Movie created." : "Movie updated.");
      upsertCategories(movie.categories, "discovered");
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["movie", movie.id] });
      navigate("/admin/movies");
    },
  });

  if (mode === "edit" && movieQuery.isLoading) {
    return <StatusView title="Loading title" detail="Fetching full movie detail for the editor." />;
  }

  async function onSubmit(values: MovieFormValues) {
    setServerError(null);
    const hasEpisodes = values.episodes.length > 0;
    const existingHasEpisodes = Boolean(movieQuery.data?.episodes.length);

    if (!values.isSeries && hasEpisodes) {
      setServerError("Movies cannot have episodes. Remove episodes or switch this title to a series.");
      return;
    }

    if (mode === "edit" && movieQuery.data?.is_series && !values.isSeries && existingHasEpisodes) {
      setServerError("Cannot convert a series with episodes into a movie. Remove episodes first.");
      return;
    }

    try {
      await saveMutation.mutateAsync(values);
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to save title");
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Movies</p>
          <h2>{mode === "create" ? "Create title" : "Edit title"}</h2>
        </div>
        <Link className="button button--ghost" to="/admin/movies">
          Back to list
        </Link>
      </div>
      <form className="editor-layout" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="panel panel--accent">
          <h3>Core fields</h3>
          <div className="form-grid">
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <input className="input" {...form.register("name")} />
            </FormField>
            <FormField label="Title type">
              <select
                className="input"
                value={isSeries ? "series" : "movie"}
                onChange={(event) => form.setValue("isSeries", event.target.value === "series")}
              >
                <option value="movie">Movie</option>
                <option value="series">Series</option>
              </select>
            </FormField>
            <FormField label="Duration (minutes)">
              <input className="input" type="number" min="1" {...form.register("duration", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Seasons count" hint="Backend will keep this aligned with episode seasons.">
              <input className="input" type="number" min="1" {...form.register("seasonsCount", { valueAsNumber: true })} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className="textarea" rows={5} {...form.register("description")} />
          </FormField>
          <div className="form-grid">
            <FormField label="Poster upload" hint="If a file is selected, the request switches to multipart and replaces the current primary poster.">
              <input className="input input--file" type="file" accept="image/*" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />
            </FormField>
          </div>
        </div>

        <div className="panel">
          <h3>Actors</h3>
          <FormField label="Search actors" hint="Uses the public actor list endpoint for async lookup.">
            <input className="input" value={actorSearch} onChange={(event) => setActorSearch(event.target.value)} />
          </FormField>
          <div className="chip-row">
            {selectedActorIds.map((actorId) => (
              <button
                key={actorId}
                type="button"
                className="chip"
                onClick={() => form.setValue("actors", selectedActorIds.filter((id) => id !== actorId))}
              >
                {actorMap.get(actorId)?.full_name ?? actorId} ×
              </button>
            ))}
          </div>
          <div className="picker-list">
            {actorSearchQuery.data?.items.map((actor) => (
              <button
                key={actor.id}
                type="button"
                className="picker-item"
                disabled={selectedActorIds.includes(actor.id)}
                onClick={() => form.setValue("actors", Array.from(new Set([...selectedActorIds, actor.id])))}
              >
                {actor.full_name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Categories</h3>
          <p className="field__hint">
            Categories come from locally discovered movie payloads plus created records. Add a raw UUID if the backend already has a category the UI cannot discover.
          </p>
          <div className="chip-row">
            {selectedCategoryIds.map((categoryId) => (
              <button
                key={categoryId}
                type="button"
                className="chip"
                onClick={() => form.setValue("categories", selectedCategoryIds.filter((id) => id !== categoryId))}
              >
                {categoryMap.get(categoryId)?.name ?? categoryId} ×
              </button>
            ))}
          </div>
          <div className="picker-list">
            {registry.map((category) => (
              <button
                key={category.id}
                type="button"
                className="picker-item"
                disabled={selectedCategoryIds.includes(category.id)}
                onClick={() => form.setValue("categories", Array.from(new Set([...selectedCategoryIds, category.id])))}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <input className="input" placeholder="Paste category UUID" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} />
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                const normalized = categoryDraft.trim();
                if (!normalized) return;
                form.setValue("categories", Array.from(new Set([...selectedCategoryIds, normalized])));
                setCategoryDraft("");
              }}
            >
              Add UUID
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h3>Episodes</h3>
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
          {!isSeries ? (
            <div className="alert alert--warning">This title is currently marked as a movie. Episodes must be removed before save unless you switch it back to a series.</div>
          ) : null}
          {fields.length ? (
            <div className="episode-table">
              {fields.map((field, index) => (
                <div key={field.id} className="episode-row">
                  <input className="input" type="number" min="1" {...form.register(`episodes.${index}.season_number`, { valueAsNumber: true })} />
                  <input className="input" type="number" min="1" {...form.register(`episodes.${index}.episode_number`, { valueAsNumber: true })} />
                  <input className="input" placeholder="Title" {...form.register(`episodes.${index}.title`)} />
                  <input className="input" placeholder="Video URL" {...form.register(`episodes.${index}.video_url`)} />
                  <input className="input" type="number" min="0" placeholder="Minutes" {...form.register(`episodes.${index}.duration`, { valueAsNumber: true })} />
                  <button type="button" className="button button--danger" onClick={() => remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <StatusView title="No episodes added" detail="Leave it empty for movies or add episode rows for a series." />
          )}
        </div>

        {serverError ? <div className="alert alert--error">{serverError}</div> : null}
        <div className="button-row">
          <button className="button" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : mode === "create" ? "Create title" : "Save changes"}
          </button>
          <Link className="button button--ghost" to="/admin/movies">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
