import { api } from './api';
import type { PageResponse } from './api';
import type { MovieCategory } from './movieCategories';
import type { Actor } from './actors';

export interface SerialListItem {
  id: string;
  name: string;
  poster_key?: string | null;
  poster_url?: string | null;
  average_rating: number;
  created_at: string;
  categories: MovieCategory[];
}

export interface EpisodeFile {
  id: string;
  episode_id: string;
  minio_bucket: string;
  minio_object_key: string;
  file_size?: number | null;
  mime_type?: string | null;
  video_url?: string | null;
}

export interface SerialEpisode {
  id: string;
  season_id: string;
  episode_number: number;
  title?: string | null;
  description?: string | null;
  duration?: number | null;
  episode_file?: EpisodeFile | null;
}

export interface SerialSeason {
  id: string;
  serial_id: string;
  season_number: number;
  title?: string | null;
  release_year?: number | null;
  episodes: SerialEpisode[];
}

export interface SerialDetail {
  id: string;
  name: string;
  description?: string | null;
  poster_key?: string | null;
  poster_url?: string | null;
  average_rating: number;
  created_at: string;
  updated_at?: string | null;
  categories: MovieCategory[];
  actors: Actor[];
  seasons: SerialSeason[];
}

export interface SerialCreate {
  name: string;
  description?: string;
  poster?: string;
  actors?: string[];
  categories?: string[];
}

export type SerialUpdate = Partial<SerialCreate>;

export interface SeasonCreate {
  season_number: number;
  title?: string;
  release_year?: number;
}

export type SeasonUpdate = Partial<SeasonCreate>;

export interface EpisodeCreate {
  episode_number: number;
  title?: string;
  description?: string;
  duration?: number;
}

export type EpisodeUpdate = Partial<EpisodeCreate>;

export interface SerialsQuery {
  query?: string;
  category_id?: string;
  skip?: number;
  limit?: number;
}

export const serialsService = {
  getSerials: (params: SerialsQuery = {}) =>
    api.get<PageResponse<SerialListItem>>('/serials/', {
      query: {
        query: params.query,
        category_id: params.category_id,
        skip: params.skip,
        limit: params.limit,
      },
    }),

  getSerial: (id: string) => api.get<SerialDetail>(`/admin/serials/${id}`),

  createSerial: (data: SerialCreate) => api.post<SerialDetail>('/admin/serials/', data),

  updateSerial: (id: string, data: SerialUpdate) =>
    api.patch<SerialDetail>(`/admin/serials/${id}`, data),

  deleteSerial: (id: string) => api.delete<void>(`/admin/serials/${id}`),

  uploadSerialPoster: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.postForm<SerialDetail>(`/admin/serials/${id}/poster`, formData);
  },

  addSeason: (serialId: string, data: SeasonCreate) =>
    api.post<SerialSeason>(`/admin/serials/${serialId}/seasons/`, data),

  updateSeason: (serialId: string, seasonId: string, data: SeasonUpdate) =>
    api.patch<SerialSeason>(`/admin/serials/${serialId}/seasons/${seasonId}`, data),

  deleteSeason: (serialId: string, seasonId: string) =>
    api.delete<void>(`/admin/serials/${serialId}/seasons/${seasonId}`),

  addEpisode: (seasonId: string, data: EpisodeCreate) =>
    api.post<SerialEpisode>(`/admin/serials/seasons/${seasonId}/episodes/`, data),

  updateEpisode: (seasonId: string, episodeId: string, data: EpisodeUpdate) =>
    api.patch<SerialEpisode>(`/admin/serials/seasons/${seasonId}/episodes/${episodeId}`, data),

  deleteEpisode: (seasonId: string, episodeId: string) =>
    api.delete<void>(`/admin/serials/seasons/${seasonId}/episodes/${episodeId}`),

  uploadEpisodeVideo: (episodeId: string, file: File) => {
    const formData = new FormData();
    formData.append('video_file', file);
    return api.postForm<{ status: string; file_id: string }>(
      `/admin/serials/episodes/${episodeId}/upload`,
      formData,
    );
  },
};

export type Serial = SerialListItem;
