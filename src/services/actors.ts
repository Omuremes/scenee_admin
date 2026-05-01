import { api } from './api';

export interface Actor {
  id: string;
  full_name: string;
  photo_url?: string;
  bio?: string;
}

export interface ActorCreate {
  full_name: string;
  photo_url?: string;
  bio?: string;
}

export interface ActorPageResponse {
  items: Actor[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type ActorUpdate = Partial<ActorCreate>;

export const actorsService = {
  getActors: () => api.get<ActorPageResponse>('/admin/actors/'),
  createActor: (data: ActorCreate | FormData) => {
    if (data instanceof FormData) {
      return api.postForm<Actor>('/admin/actors/', data);
    }
    return api.post<Actor>('/admin/actors/', data);
  },
  updateActor: (id: string, data: ActorUpdate) => api.patch<Actor>(`/admin/actors/${id}`, data),
  deleteActor: (id: string) => api.delete<void>(`/admin/actors/${id}`),
};
