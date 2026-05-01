import { api } from './api';

export interface MovieCategory {
  id: string;
  name: string;
  slug: string;
}

export interface MovieCategoryCreate {
  name: string;
  slug?: string;
}

export type MovieCategoryUpdate = Partial<MovieCategoryCreate>;

export interface MovieCategoryPageResponse {
  items: MovieCategory[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export const movieCategoriesService = {
  getMovieCategories: () => api.get<MovieCategoryPageResponse>('/admin/movies/categories'),
  createMovieCategory: (data: MovieCategoryCreate) => api.post<MovieCategory>('/admin/movies/categories', data),
  updateMovieCategory: (id: string, data: MovieCategoryUpdate) => api.patch<MovieCategory>(`/admin/movies/categories/${id}`, data),
  deleteMovieCategory: (id: string) => api.delete<void>(`/admin/movies/categories/${id}`),
};
