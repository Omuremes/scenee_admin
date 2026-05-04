import { api } from './api';
import type { PageResponse } from './api';

const ADMIN_EVENTS = '/admin/events';

export type EventType =
  | 'cinema'
  | 'concerts'
  | 'sports'
  | 'stand-up'
  | 'kids'
  | 'events';

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'cinema', label: 'Cinema' },
  { value: 'concerts', label: 'Concerts' },
  { value: 'sports', label: 'Sports' },
  { value: 'stand-up', label: 'Stand-up' },
  { value: 'kids', label: 'Kids' },
  { value: 'events', label: 'Events / other' },
];

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export interface EventListItem {
  id: string;
  title: string;
  type: EventType;
  event_type?: EventType | null;
  poster_url?: string | null;
  image_url?: string | null;
  city: string;
  category?: EventCategory | null;
  next_session_at?: string | null;
  min_price?: number | null;
  average_rating: number;
  is_active: boolean;
  start_datetime?: string | null;
  price?: number | null;
}

export interface EventSeat {
  id: string;
  session_id: string;
  label: string;
  zone?: string | null;
  price: number;
  is_available: boolean;
}

export type SessionPricingType = 'fixed' | 'per_seat' | 'daily' | 'evening' | 'all';

export interface EventSession {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at?: string | null;
  base_price: number;
  pricing_type: SessionPricingType;
  cinema_name?: string | null;
  hall_name?: string | null;
  seats: EventSeat[];
}

export interface EventDetail {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  event_type?: EventType | null;
  poster_url?: string | null;
  image_url?: string | null;
  trailer_url?: string | null;
  city: string;
  category_id?: string | null;
  category?: EventCategory | null;
  is_active: boolean;
  average_rating: number;
  sessions: EventSession[];
  start_datetime?: string | null;
  end_datetime?: string | null;
  price?: number | null;
}

export interface EventCreateInput {
  title: string;
  description?: string;
  type: EventType;
  poster_url?: string;
  trailer_url?: string;
  city: string;
  category_id?: string;
  is_active?: boolean;
  start_datetime?: string;
  end_datetime?: string;
  venue_id?: string;
  price?: number;
  max_capacity?: number;
}

export type EventUpdateInput = Partial<EventCreateInput>;

export interface EventsQuery {
  query?: string;
  type?: EventType;
  city?: string;
  category_id?: string;
  offset?: number;
  limit?: number;
}

export const eventsService = {
  getEvents: (params: EventsQuery = {}) =>
    api.get<PageResponse<EventListItem>>(`${ADMIN_EVENTS}/`, {
      query: {
        query: params.query,
        type: params.type,
        city: params.city,
        category_id: params.category_id,
        offset: params.offset,
        limit: params.limit,
      },
    }),

  getEvent: (id: string) => api.get<EventDetail>(`${ADMIN_EVENTS}/${id}`),

  createEvent: (data: EventCreateInput) =>
    api.post<EventDetail>(`${ADMIN_EVENTS}/`, data),

  uploadEventPoster: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.postForm<EventDetail>(`${ADMIN_EVENTS}/${id}/poster`, formData);
  },

  uploadEventTrailer: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('trailer', file);
    return api.postForm<EventDetail>(`${ADMIN_EVENTS}/${id}/trailer`, formData);
  },

  updateEvent: (id: string, data: EventUpdateInput) =>
    api.patch<EventDetail>(`${ADMIN_EVENTS}/${id}`, data),

  setActive: (id: string, is_active: boolean) =>
    api.patch<EventDetail>(`${ADMIN_EVENTS}/${id}/status`, undefined, {
      query: { is_active },
    }),

  deleteEvent: (id: string) => api.delete<void>(`${ADMIN_EVENTS}/${id}`),
};

export interface EventCategoriesQuery {
  query?: string;
  offset?: number;
  limit?: number;
}

export const eventCategoriesService = {
  getCategories: (params: EventCategoriesQuery = {}) =>
    api.get<PageResponse<EventCategory>>(`${ADMIN_EVENTS}/categories`, {
      query: {
        query: params.query,
        offset: params.offset,
        limit: params.limit,
      },
    }),

  createCategory: (data: { name: string; slug?: string }) =>
    api.post<EventCategory>(`${ADMIN_EVENTS}/categories`, data),

  updateCategory: (id: string, data: { name?: string; slug?: string }) =>
    api.patch<EventCategory>(`${ADMIN_EVENTS}/categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete<void>(`${ADMIN_EVENTS}/categories/${id}`),
};

export interface SessionCreateInput {
  starts_at: string;
  ends_at?: string;
  base_price: number;
  pricing_type: SessionPricingType;
  cinema_name?: string;
  hall_name?: string;
}

export type SessionUpdateInput = Partial<SessionCreateInput>;

export const eventSessionsService = {
  list: (eventId: string) =>
    api.get<EventSession[]>(`${ADMIN_EVENTS}/${eventId}/sessions`),

  create: (eventId: string, data: SessionCreateInput) =>
    api.post<EventSession>(`${ADMIN_EVENTS}/${eventId}/sessions`, { ...data, seats: [] }),

  update: (sessionId: string, data: SessionUpdateInput) =>
    api.patch<EventSession>(`${ADMIN_EVENTS}/sessions/${sessionId}`, data),

  delete: (sessionId: string) =>
    api.delete<void>(`${ADMIN_EVENTS}/sessions/${sessionId}`),
};

export interface SeatCreateInput {
  label: string;
  zone?: string;
  price: number;
  is_available?: boolean;
}

export type SeatUpdateInput = Partial<SeatCreateInput>;

export const eventSeatsService = {
  list: (sessionId: string, onlyAvailable = false) =>
    api.get<EventSeat[]>(`${ADMIN_EVENTS}/sessions/${sessionId}/seats`, {
      query: { only_available: onlyAvailable },
    }),

  create: (sessionId: string, data: SeatCreateInput) =>
    api.post<EventSeat>(`${ADMIN_EVENTS}/sessions/${sessionId}/seats`, data),

  update: (seatId: string, data: SeatUpdateInput) =>
    api.patch<EventSeat>(`${ADMIN_EVENTS}/seats/${seatId}`, data),

  delete: (seatId: string) =>
    api.delete<void>(`${ADMIN_EVENTS}/seats/${seatId}`),
};

export type Event = EventListItem;
