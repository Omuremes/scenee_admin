import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Pagination } from "../../components/Pagination";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { moviesApi } from "../../lib/api";
import { getCategoryRegistry, subscribeCategoryRegistry, upsertCategories } from "../../lib/categoryRegistry";
import { formatDateTime } from "../../lib/utils";

const LIMIT = 10;
const typeFilters = [
  { value: "all" as const, label: "All" },
  { value: "false" as const, label: "Movies" },
  { value: "true" as const, label: "Series" },
];

export function MoviesPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSeries, setIsSeries] = useState<"all" | "true" | "false">("all");
  const [registry, setRegistry] = useState(getCategoryRegistry);

  useEffect(() => subscribeCategoryRegistry(() => setRegistry(getCategoryRegistry())), []);

  const moviesQuery = useQuery({
    queryKey: ["movies", { query, categoryId, isSeries, offset }],
    queryFn: () =>
      moviesApi.list({
        query,
        categoryId: categoryId || undefined,
        isSeries: isSeries === "all" ? "all" : isSeries === "true",
        offset,
        limit: LIMIT,
      }),
  });

  useEffect(() => {
    if (!moviesQuery.data?.items) {
      return;
    }
    const categories = moviesQuery.data.items.flatMap((movie) => movie.categories);
    upsertCategories(categories, "discovered");
  }, [moviesQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: (movieId: string) => moviesApi.remove(movieId),
    onSuccess: () => {
      pushToast("success", "Movie deleted.");
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });

  if (moviesQuery.isLoading) {
    return <StatusView title="Loading movies" detail="Fetching the admin movie catalog." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Movies</p>
          <h2>Movie and series inventory</h2>
        </div>
        <Link className="button" to="/admin/movies/new">
          New title
        </Link>
      </div>
      <div className="panel">
        <div className="toolbar toolbar--wide">
          <input className="input" placeholder="Search title or description" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <p></p>
        <div className="filter-stack">
          <div className="filter-block">
            <span className="filter-block__label">Type</span>
            <div className="chip-row">
              {typeFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`chip filter-chip${isSeries === filter.value ? " filter-chip--active" : ""}`}
                  onClick={() => {
                    setOffset(0);
                    setIsSeries(filter.value);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <span className="filter-block__label">Category</span>
            <div className="chip-row">
              <button
                type="button"
                className={`chip filter-chip${categoryId === "" ? " filter-chip--active" : ""}`}
                onClick={() => {
                  setOffset(0);
                  setCategoryId("");
                }}
              >
                All
              </button>
              {registry.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`chip filter-chip${categoryId === category.id ? " filter-chip--active" : ""}`}
                  onClick={() => {
                    setOffset(0);
                    setCategoryId(category.id);
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {moviesQuery.data?.items.length ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Categories</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {moviesQuery.data.items.map((movie) => (
                  <tr key={movie.id}>
                    <td>
                      <strong>{movie.name}</strong>
                      <span className="table-subline">Rating {movie.average_rating.toFixed(1)}</span>
                    </td>
                    <td>{movie.is_series ? `Series (${movie.seasons_count})` : "Movie"}</td>
                    <td>{movie.categories.map((category) => category.name).join(", ") || "—"}</td>
                    <td>{formatDateTime(movie.created_at)}</td>
                    <td className="actions-cell">
                      <Link className="button button--ghost" to={`/admin/movies/${movie.id}`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="button button--danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete "${movie.name}"?`)) {
                            void deleteMutation.mutateAsync(movie.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination offset={moviesQuery.data.offset} limit={moviesQuery.data.limit} total={moviesQuery.data.total} onChange={setOffset} />
          </>
        ) : (
          <StatusView title="No titles found" detail="Create a movie or series, or broaden the filters." />
        )}
      </div>
    </section>
  );
}
