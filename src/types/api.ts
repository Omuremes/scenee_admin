export type Role = "admin" | "user" | string;

export type FieldErrors = Record<string, string>;

export interface ApiErrorShape {
  status: number;
  message: string;
  fieldErrors?: FieldErrors;
}

export interface SessionUser {
  id: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface Actor {
  id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
}

export interface MovieCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Poster {
  id: string;
  movie_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
}

export interface Episode {
  id?: string;
  movie_id?: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  description: string | null;
  video_url: string | null;
  duration: number | null;
}

export interface MovieListItem {
  id: string;
  name: string;
  is_series: boolean;
  duration: number | null;
  seasons_count: number;
  average_rating: number;
  category: MovieCategory | null;
  categories: MovieCategory[];
  primary_poster: Poster | null;
  created_at: string;
}

export interface MovieDetail extends MovieListItem {
  description: string | null;
  updated_at: string | null;
  actors: Actor[];
  posters: Poster[];
  episodes: Episode[];
}

export type EventType = "movie_screening" | "concert" | "theater" | "standup" | "sport";

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
}

export interface EventListItem {
  id: string;
  title: string;
  event_type: EventType;
  start_datetime: string;
  venue: Venue;
  price: number;
  available_seats: number;
  average_rating: number;
  image_url: string | null;
}

export interface EventDetail extends EventListItem {
  description: string | null;
  end_datetime: string | null;
  venue_id: string;
  max_capacity: number;
  storage_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ActorFormValues {
  fullName: string;
  photoUrl: string;
  bio: string;
}

export interface CategoryFormValues {
  name: string;
  slug: string;
}

export interface MovieFormValues {
  name: string;
  description: string;
  isSeries: boolean;
  duration: number | null;
  seasonsCount: number;
  posterUrl: string;
  actors: string[];
  categories: string[];
  episodes: Episode[];
}

export interface EventFormValues {
  title: string;
  description: string;
  eventType: EventType;
  startDatetime: string;
  endDatetime: string;
  venueId: string;
  price: number;
  maxCapacity: number;
  imageUrl: string;
  storagePath: string;
}
