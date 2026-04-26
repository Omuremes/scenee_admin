import { MovieCategory } from "../types/api";

const CATEGORY_STORAGE_KEY = "scenee_admin_categories";
const EVENT_NAME = "scenee_admin_categories_changed";

export interface CategoryRegistryRecord extends MovieCategory {
  source: "created" | "discovered";
}

function parseRegistry(raw: string | null): CategoryRegistryRecord[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CategoryRegistryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCategoryRegistry() {
  return parseRegistry(localStorage.getItem(CATEGORY_STORAGE_KEY));
}

function writeRegistry(records: CategoryRegistryRecord[]) {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function upsertCategories(categories: MovieCategory[], source: CategoryRegistryRecord["source"]) {
  if (!categories.length) {
    return;
  }

  const current = getCategoryRegistry();
  const map = new Map(current.map((item) => [item.id, item]));

  categories.forEach((category) => {
    const existing = map.get(category.id);
    map.set(category.id, {
      ...category,
      source: existing?.source === "created" ? "created" : source,
    });
  });

  writeRegistry(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
}

export function subscribeCategoryRegistry(callback: () => void) {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
