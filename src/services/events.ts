import { api } from './api';

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type?: string;
  event_type?: string;
  poster_url?: string;
  image_url?: string;
  trailer_url?: string;
  city: string;
  category_id?: string;
  is_active: boolean;
  category?: EventCategory;
}

export interface EventCreate {
  title: string;
  description?: string;
  type?: string;
  poster_url?: string;
  city: string;
  category_id?: string;
  is_active?: boolean;
}

export type EventUpdate = Partial<EventCreate>;

export interface EventPageResponse {
  items: Event[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const eventsService = {
  getEvents: () => api.get<EventPageResponse>('/admin/events/'),
  createEvent: (data: EventCreate) => api.post<Event>('/admin/events/', data),
  updateEvent: (id: string, data: EventUpdate) => api.patch<Event>(`/admin/events/${id}`, data),
  deleteEvent: (id: string) => api.delete<void>(`/admin/events/${id}`),
};
