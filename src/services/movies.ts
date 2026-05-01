import { api } from './api';
import type { PageResponse } from './api';
import type { MovieCategory } from './movieCategories';
import type { Actor } from './actors';

export interface MovieListItem {
  id: string;
  name: string;
  duration?: number;
  average_rating: number;
  category?: MovieCategory | null;
  categories: MovieCategory[];
  poster_url?: string | null;
  created_at: string;
}

export interface MovieDetail extends MovieListItem {
  description?: string | null;
  poster_key?: string | null;
  video_file_key?: string | null;
  video_url?: string | null;
  actors: Actor[];
  posters: Array<{ id: string; url: string; storage_path?: string | null; is_primary: boolean }>;
  primary_poster?: { id: string; url: string } | null;
  updated_at?: string | null;
}

export interface MovieCreate {
  name: string;
  description?: string;
  duration?: number;
  poster?: string;
  actors?: string[];
  categories?: string[];
}

export type MovieUpdate = Partial<MovieCreate>;

export interface MoviesQuery {
  query?: string;
  category_id?: string;
  offset?: number;
  limit?: number;
}

export const moviesService = {
  getMovies: (params: MoviesQuery = {}) =>
    api.get<PageResponse<MovieListItem>>('/admin/movies/', {
      query: {
        query: params.query,
        category_id: params.category_id,
        offset: params.offset,
        limit: params.limit,
      },
    }),

  getMovie: (id: string) => api.get<MovieDetail>(`/admin/movies/${id}`),

  createMovie: (data: MovieCreate) => api.post<MovieDetail>('/admin/movies/', data),

  updateMovie: (id: string, data: MovieUpdate) =>
    api.patch<MovieDetail>(`/admin/movies/${id}`, data),

  deleteMovie: (id: string) => api.delete<void>(`/admin/movies/${id}`),

  uploadMoviePoster: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.postForm<MovieDetail>(`/admin/movies/${id}/poster`, formData);
  },

  uploadMovieVideo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('video_file', file);
    return api.postForm<MovieDetail>(`/admin/movies/${id}/video`, formData);
  },
};

export type Movie = MovieListItem;
