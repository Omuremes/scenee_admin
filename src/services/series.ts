import { api } from './api';

export interface Serial {
  id: string;
  name: string;
  description?: string;
  is_series: boolean;
  seasons_count: number;
  average_rating: number;
  poster_url?: string;
}

export interface SerialCreate {
  name: string;
  description?: string;
}

export interface SerialPageResponse {
  items: Serial[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type SerialUpdate = Partial<SerialCreate>;

export const seriesService = {
  getSeries: () => api.get<SerialPageResponse>('/admin/serials/'),
  createSeries: (data: SerialCreate) => api.post<Serial>('/admin/serials/', data),
  updateSeries: (id: string, data: SerialUpdate) => api.patch<Serial>(`/admin/serials/${id}`, data),
  deleteSeries: (id: string) => api.delete<void>(`/admin/serials/${id}`),
};
