import { api } from './api';
import type { PageResponse } from './api';

export interface Actor {
  id: string;
  full_name: string;
  photo_url?: string | null;
  bio?: string | null;
}

export interface ActorJsonCreate {
  full_name: string;
  photo_url?: string;
  bio?: string;
}

export type ActorUpdate = Partial<ActorJsonCreate>;

export interface ActorsQuery {
  query?: string;
  offset?: number;
  limit?: number;
}

export const actorsService = {
  getActors: (params: ActorsQuery = {}) =>
    api.get<PageResponse<Actor>>('/admin/actors/', {
      query: {
        query: params.query,
        offset: params.offset,
        limit: params.limit,
      },
    }),

  getActor: (id: string) => api.get<Actor>(`/admin/actors/${id}`),

  createActor: (data: ActorJsonCreate | FormData) => {
    if (data instanceof FormData) {
      return api.postForm<Actor>('/admin/actors/', data);
    }
    return api.post<Actor>('/admin/actors/', data);
  },

  updateActor: (id: string, data: ActorUpdate) =>
    api.patch<Actor>(`/admin/actors/${id}`, data),

  deleteActor: (id: string) => api.delete<void>(`/admin/actors/${id}`),
};
