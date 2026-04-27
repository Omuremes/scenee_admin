import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { actorsApi, eventsApi, moviesApi } from "../../lib/api";
import { StatusView } from "../../components/StatusView";

export function DashboardPage() {
  const actorsQuery = useQuery({ queryKey: ["actors", "summary"], queryFn: () => actorsApi.list({ offset: 0, limit: 1 }) });
  const moviesQuery = useQuery({ queryKey: ["movies", "summary"], queryFn: () => moviesApi.list({ offset: 0, limit: 1, isSeries: "all" }) });
  const eventsQuery = useQuery({ queryKey: ["events", "summary"], queryFn: () => eventsApi.list({ offset: 0, limit: 1 }) });

  if (actorsQuery.isLoading || moviesQuery.isLoading || eventsQuery.isLoading) {
    return <StatusView title="Loading dashboard" detail="Pulling resource counts from the first page of each admin list." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Operations overview</p>
          <h2>Catalog control room</h2>
        </div>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <span>Actors</span>
          <strong>{actorsQuery.data?.total ?? "—"}</strong>
          <Link to="/admin/actors">Manage cast records</Link>
        </article>
        <article className="metric-card">
          <span>Movies & series</span>
          <strong>{moviesQuery.data?.total ?? "—"}</strong>
          <Link to="/admin/movies">Open title inventory</Link>
        </article>
        <article className="metric-card">
          <span>Events</span>
          <strong>{eventsQuery.data?.total ?? "—"}</strong>
          <Link to="/admin/events">Manage live schedule</Link>
        </article>
      </div>
      <div className="two-column">
        <section className="panel panel--accent">
          <h3>Fast actions</h3>
          <div className="button-row">
            <Link className="button" to="/admin/movies/new">
              New movie
            </Link>
            <Link className="button button--ghost" to="/admin/events/new">
              New event
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
