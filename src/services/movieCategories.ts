import { api } from './api';
import type { PageResponse } from './api';

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

export interface MovieCategoriesQuery {
  query?: string;
  offset?: number;
  limit?: number;
}

export const movieCategoriesService = {
  getMovieCategories: (params: MovieCategoriesQuery = {}) =>
    api.get<PageResponse<MovieCategory>>('/admin/movies/categories', {
      query: {
        query: params.query,
        offset: params.offset,
        limit: params.limit,
      },
    }),

  createMovieCategory: (data: MovieCategoryCreate) =>
    api.post<MovieCategory>('/admin/movies/categories', data),

  updateMovieCategory: (id: string, data: MovieCategoryUpdate) =>
    api.patch<MovieCategory>(`/admin/movies/categories/${id}`, data),

  deleteMovieCategory: (id: string) =>
    api.delete<void>(`/admin/movies/categories/${id}`),
};
