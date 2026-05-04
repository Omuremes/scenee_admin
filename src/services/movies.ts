import { api } from './api';
import type { PageResponse } from './api';
import type { EventDetail, EventListItem } from './events';

const ADMIN_EVENTS = '/admin/events';
const MOVIE_EVENT_TYPE = 'cinema';

export interface MovieCategory {
  id: string;
  name: string;
  slug: string;
}

export interface MovieListItem {
  id: string;
  name: string;
  average_rating: number;
  category?: MovieCategory | null;
  categories: MovieCategory[];
  poster_url?: string | null;
  created_at: string;
}

export interface MovieDetail extends MovieListItem {
  description?: string | null;
  actors: Array<{ id: string; full_name: string }>;
  posters: Array<{ id: string; url: string; storage_path?: string | null; is_primary: boolean }>;
  primary_poster?: { id: string; url: string } | null;
  updated_at?: string | null;
  is_active?: boolean;
  city?: string | null;
}

export interface MovieCreate {
  name: string;
  description?: string;
  categories?: string[];
}

export type MovieUpdate = Partial<MovieCreate>;

export interface MoviesQuery {
  query?: string;
  category_id?: string;
  offset?: number;
  limit?: number;
}

function mapEventListItemToMovie(item: EventListItem): MovieListItem {
  return {
    id: item.id,
    name: item.title,
    average_rating: item.average_rating,
    category: item.category ?? null,
    categories: item.category ? [item.category] : [],
    poster_url: item.poster_url ?? item.image_url ?? null,
    created_at: item.start_datetime ?? item.next_session_at ?? '',
  };
}

function mapEventDetailToMovie(item: EventDetail): MovieDetail {
  const posterUrl = item.poster_url ?? item.image_url ?? null;
  return {
    ...mapEventListItemToMovie({
      id: item.id,
      title: item.title,
      type: item.type,
      event_type: item.event_type,
      poster_url: item.poster_url,
      image_url: item.image_url,
      city: item.city,
      category: item.category ?? null,
      next_session_at: item.sessions[0]?.starts_at ?? item.start_datetime ?? null,
      min_price: item.price ?? null,
      average_rating: item.average_rating,
      is_active: item.is_active,
      start_datetime: item.start_datetime ?? null,
      price: item.price ?? null,
    }),
    description: item.description ?? null,
    actors: [],
    posters: posterUrl
      ? [{ id: item.id, url: posterUrl, storage_path: null, is_primary: true }]
      : [],
    primary_poster: posterUrl ? { id: item.id, url: posterUrl } : null,
    updated_at: item.end_datetime ?? null,
    is_active: item.is_active,
    city: item.city,
  };
}

function mapMoviePayloadToEvent(data: MovieCreate | MovieUpdate) {
  return {
    title: data.name,
    description: data.description,
    type: MOVIE_EVENT_TYPE,
    event_type: MOVIE_EVENT_TYPE,
    category_id: data.categories?.[0],
  };
}

export const moviesService = {
  async getMovies(params: MoviesQuery = {}): Promise<PageResponse<MovieListItem>> {
    const response = await api.get<{ items: EventListItem[]; total: number; offset: number; limit: number; has_more: boolean }>(
      `${ADMIN_EVENTS}/`,
      {
        query: {
          type: MOVIE_EVENT_TYPE,
          category_id: params.category_id,
          offset: params.offset,
          limit: params.limit,
          query: params.query,
        },
      },
    );

    const query = params.query?.trim().toLowerCase();
    const items = (response.items ?? []).map(mapEventListItemToMovie);
    const filteredItems = query
      ? items.filter((item) => item.name.toLowerCase().includes(query))
      : items;

    return {
      ...response,
      items: filteredItems,
      total: query ? filteredItems.length : response.total,
      has_more: query ? false : response.has_more,
    };
  },

  async getMovie(id: string): Promise<MovieDetail> {
    const response = await api.get<EventDetail>(`${ADMIN_EVENTS}/${id}`);
    return mapEventDetailToMovie(response);
  },

  async createMovie(data: MovieCreate): Promise<MovieDetail> {
    const response = await api.post<EventDetail>(`${ADMIN_EVENTS}/`, mapMoviePayloadToEvent(data));
    return mapEventDetailToMovie(response);
  },

  async updateMovie(id: string, data: MovieUpdate): Promise<MovieDetail> {
    const response = await api.patch<EventDetail>(`${ADMIN_EVENTS}/${id}`, mapMoviePayloadToEvent(data));
    return mapEventDetailToMovie(response);
  },

  deleteMovie: (id: string) => api.delete<void>(`${ADMIN_EVENTS}/${id}`),
};

export type Movie = MovieListItem;
