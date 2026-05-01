import { api } from './api';

export interface Movie {
  id: string;
  name: string;
  description?: string;
  is_series: boolean;
  duration_minutes?: number;
  seasons_count: number;
  average_rating: number;
  poster_url?: string;
}

export interface MovieCreate {
  name: string;
  description?: string;
  is_series: boolean;
  duration_minutes?: number;
  seasons_count?: number;
}

export interface MoviePageResponse {
  items: Movie[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type MovieUpdate = Partial<MovieCreate>;

export const moviesService = {
  getMovies: () => api.get<MoviePageResponse>('/admin/movies/'),
  createMovie: (data: MovieCreate) => api.post<Movie>('/admin/movies/', data),
  updateMovie: (id: string, data: MovieUpdate) => api.patch<Movie>(`/admin/movies/${id}`, data),
  deleteMovie: (id: string) => api.delete<void>(`/admin/movies/${id}`),
  uploadMoviePoster: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.postForm<Movie>(`/admin/movies/${id}/poster`, formData);
  }
};
