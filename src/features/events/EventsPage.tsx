import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

import { Pagination } from "../../components/Pagination";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { eventsApi } from "../../lib/api";
import { formatDateTime, formatMoney } from "../../lib/utils";

const LIMIT = 10;

export function EventsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [offset, setOffset] = useState(0);
  const eventsQuery = useQuery({
    queryKey: ["events", { offset }],
    queryFn: () => eventsApi.list({ offset, limit: LIMIT }),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => eventsApi.remove(eventId),
    onSuccess: () => {
      pushToast("success", "Event deleted.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  if (eventsQuery.isLoading) {
    return <StatusView title="Loading events" detail="Fetching the admin event schedule." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Events</p>
          <h2>Event schedule</h2>
        </div>
        <Link className="button" to="/admin/events/new">
          New event
        </Link>
      </div>
      <div className="panel">
        {eventsQuery.data?.items.length ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Venue</th>
                  <th>Start</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eventsQuery.data.items.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <span className="table-subline">{event.available_seats} seats left</span>
                    </td>
                    <td>{event.event_type}</td>
                    <td>{event.venue.name}</td>
                    <td>{formatDateTime(event.start_datetime)}</td>
                    <td>{formatMoney(event.price)}</td>
                    <td className="actions-cell">
                      <Link className="button button--ghost" to={`/admin/events/${event.id}`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="button button--danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete "${event.title}"?`)) {
                            void deleteMutation.mutateAsync(event.id);
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
            <Pagination offset={eventsQuery.data.offset} limit={eventsQuery.data.limit} total={eventsQuery.data.total} onChange={setOffset} />
          </>
        ) : (
          <StatusView title="No events found" detail="Create the first event or check whether the admin schedule is empty." />
        )}
      </div>
    </section>
  );
}
