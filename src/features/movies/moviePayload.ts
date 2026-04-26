import { Episode, MovieFormValues } from "../../types/api";

function normalizeEpisode(episode: Episode) {
  return {
    season_number: Number(episode.season_number),
    episode_number: Number(episode.episode_number),
    title: episode.title || null,
    description: episode.description || null,
    video_url: episode.video_url || null,
    duration: episode.duration == null ? null : Number(episode.duration),
  };
}

export function buildMovieRequestBody(values: MovieFormValues, posterFile: File | null) {
  const sanitizedEpisodes = values.episodes.map(normalizeEpisode);
  const basePayload = {
    name: values.name.trim(),
    description: values.description.trim() || null,
    is_series: values.isSeries,
    duration: values.duration == null ? null : Number(values.duration),
    seasons_count: Number(values.seasonsCount),
    actors: values.actors,
    categories: values.categories,
    episodes: sanitizedEpisodes,
  };

  if (posterFile) {
    const formData = new FormData();
    formData.append("name", basePayload.name);
    if (basePayload.description) formData.append("description", basePayload.description);
    formData.append("is_series", String(basePayload.is_series));
    if (basePayload.duration != null) formData.append("duration", String(basePayload.duration));
    formData.append("seasons_count", String(basePayload.seasons_count));
    basePayload.actors.forEach((actorId) => formData.append("actors", actorId));
    basePayload.categories.forEach((categoryId) => formData.append("categories", categoryId));
    formData.append("episodes", JSON.stringify(sanitizedEpisodes));
    formData.append("poster", posterFile);
    return formData;
  }

  return {
    ...basePayload,
    ...(values.posterUrl.trim() ? { poster: values.posterUrl.trim() } : {}),
  };
}
