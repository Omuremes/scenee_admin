import {
  Actor,
  ApiErrorShape,
  EventDetail,
  EventFormValues,
  EventListItem,
  FieldErrors,
  MovieCategory,
  MovieDetail,
  MovieListItem,
  PaginatedResult,
  SessionUser,
  TokenResponse,
} from "../types/api";
import { getStoredToken } from "./session";
import { fromDatetimeLocal } from "./utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://192.168.68.150:8000";

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  fieldErrors?: FieldErrors;

  constructor({ status, message, fieldErrors }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function createFieldErrors(detail: unknown) {
  if (!Array.isArray(detail)) {
    return undefined;
  }

  return detail.reduce<FieldErrors>((acc, item) => {
    if (!item || typeof item !== "object") {
      return acc;
    }

    const candidate = item as { loc?: unknown[]; msg?: string };
    const key = String(candidate.loc?.[candidate.loc.length - 1] ?? "form");
    acc[key] = candidate.msg ?? "Invalid value";
    return acc;
  }, {});
}

export function normalizePage<T>(payload: {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}): PaginatedResult<T> {
  return {
    items: payload.items,
    total: payload.total,
    offset: payload.offset,
    limit: payload.limit,
    hasMore: payload.has_more,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export function normalizeApiError(status: number, payload: unknown) {
  const candidate = payload as { detail?: unknown; message?: string } | null;
  const detail = candidate?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : typeof candidate?.message === "string"
        ? candidate.message
        : status === 401
          ? "Authentication required"
          : status === 403
            ? "Admin privileges required"
            : "Request failed";

  return new ApiError({
    status,
    message,
    fieldErrors: createFieldErrors(detail),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  let body = options.body as BodyInit | undefined;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && typeof body === "object") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await parseResponse(response);
    } catch {
      payload = null;
    }

    const error = normalizeApiError(response.status, payload);
    if (response.status === 401) {
      window.dispatchEvent(new Event("scenee_admin_unauthorized"));
    }
    throw error;
  }

  return parseResponse<T>(response);
}

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () =>
    request<{
      id: string;
      email: string | null;
      username: string | null;
      avatar_url: string | null;
      role: string;
      created_at: string;
    }>("/v1/auth/me").then((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatar_url,
      role: user.role,
      createdAt: user.created_at,
    }) satisfies SessionUser),
};

export const actorsApi = {
  list: (params: { query?: string; offset?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params.query) search.set("query", params.query);
    if (params.offset != null) search.set("offset", String(params.offset));
    if (params.limit != null) search.set("limit", String(params.limit));
    return request<{
      items: Actor[];
      total: number;
      offset: number;
      limit: number;
      has_more: boolean;
    }>(`/v1/actors/?${search.toString()}`).then(normalizePage);
  },
  create: (payload: Partial<Actor>) =>
    request<Actor>("/v1/admin/actors/", { method: "POST", body: payload }),
  update: (actorId: string, payload: Partial<Actor>) =>
    request<Actor>(`/v1/admin/actors/${actorId}`, { method: "PATCH", body: payload }),
  remove: (actorId: string) =>
    request<void>(`/v1/admin/actors/${actorId}`, { method: "DELETE" }),
};

export const moviesApi = {
  list: (params: {
    query?: string;
    categoryId?: string;
    isSeries?: boolean | "all";
    offset?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params.query) search.set("query", params.query);
    if (params.categoryId) search.set("category_id", params.categoryId);
    if (params.isSeries !== "all" && typeof params.isSeries === "boolean") {
      search.set("is_series", String(params.isSeries));
    }
    if (params.offset != null) search.set("offset", String(params.offset));
    if (params.limit != null) search.set("limit", String(params.limit));
    return request<{
      items: MovieListItem[];
      total: number;
      offset: number;
      limit: number;
      has_more: boolean;
    }>(`/v1/admin/movies/?${search.toString()}`).then(normalizePage);
  },
  get: (movieId: string) => request<MovieDetail>(`/v1/admin/movies/${movieId}`),
  create: (payload: FormData | Record<string, unknown>) =>
    request<MovieDetail>("/v1/admin/movies/", { method: "POST", body: payload }),
  update: (movieId: string, payload: FormData | Record<string, unknown>) =>
    request<MovieDetail>(`/v1/admin/movies/${movieId}`, { method: "PATCH", body: payload }),
  remove: (movieId: string) =>
    request<void>(`/v1/admin/movies/${movieId}`, { method: "DELETE" }),
  createCategory: (payload: { name: string; slug?: string }) =>
    request<MovieCategory>("/v1/admin/movies/categories", { method: "POST", body: payload }),
};

export const eventsApi = {
  list: (params: { offset?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params.offset != null) search.set("offset", String(params.offset));
    if (params.limit != null) search.set("limit", String(params.limit));
    return request<{
      items: EventListItem[];
      total: number;
      offset: number;
      limit: number;
      has_more: boolean;
    }>(`/v1admin/events/?${search.toString()}`).then(normalizePage);
  },
  get: (eventId: string) => request<EventDetail>(`/v1admin/events/${eventId}`),
  create: (payload: EventFormValues) =>
    request<EventDetail>("/v1admin/events/", {
      method: "POST",
      body: {
        title: payload.title,
        description: payload.description || null,
        event_type: payload.eventType,
        start_datetime: fromDatetimeLocal(payload.startDatetime),
        end_datetime: fromDatetimeLocal(payload.endDatetime),
        venue_id: payload.venueId,
        price: payload.price,
        max_capacity: payload.maxCapacity,
        image_url: payload.imageUrl || null,
        storage_path: payload.storagePath || null,
      },
    }),
  update: (eventId: string, payload: EventFormValues) =>
    request<EventDetail>(`/v1admin/events/${eventId}`, {
      method: "PUT",
      body: {
        title: payload.title,
        description: payload.description || null,
        event_type: payload.eventType,
        start_datetime: fromDatetimeLocal(payload.startDatetime),
        end_datetime: fromDatetimeLocal(payload.endDatetime),
        venue_id: payload.venueId,
        price: payload.price,
        max_capacity: payload.maxCapacity,
        image_url: payload.imageUrl || null,
        storage_path: payload.storagePath || null,
      },
    }),
  remove: (eventId: string) =>
    request<void>(`/v1admin/events/${eventId}`, { method: "DELETE" }),
};
