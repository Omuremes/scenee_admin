import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { FormField } from "../../components/form/FormField";
import { StatusView } from "../../components/StatusView";
import { useToast } from "../../components/ToastProvider";
import { eventsApi, isApiError } from "../../lib/api";
import { toDatetimeLocal } from "../../lib/utils";
import { eventFormSchema } from "./EventFormSchema";
import { EventDetail, EventFormValues } from "../../types/api";

type EventValues = z.infer<typeof eventFormSchema>;

function toFormValues(event?: EventDetail): EventFormValues {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    eventType: event?.event_type ?? "movie_screening",
    startDatetime: toDatetimeLocal(event?.start_datetime),
    endDatetime: toDatetimeLocal(event?.end_datetime),
    venueId: event?.venue_id ?? "",
    price: event?.price ?? 0,
    maxCapacity: event?.max_capacity ?? 0,
    imageUrl: event?.image_url ?? "",
    storagePath: event?.storage_path ?? "",
  };
}

export function EventEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.get(eventId!),
    enabled: mode === "edit" && Boolean(eventId),
  });

  const form = useForm<EventValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (eventQuery.data) {
      form.reset(toFormValues(eventQuery.data));
    }
  }, [eventQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: EventValues) => (mode === "create" ? eventsApi.create(values) : eventsApi.update(eventId!, values)),
    onSuccess: () => {
      pushToast("success", mode === "create" ? "Event created." : "Event updated.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      }
      navigate("/admin/events");
    },
  });

  if (mode === "edit" && eventQuery.isLoading) {
    return <StatusView title="Loading event" detail="Fetching event detail for the admin editor." />;
  }

  async function onSubmit(values: EventValues) {
    setServerError(null);
    try {
      await saveMutation.mutateAsync(values);
    } catch (error) {
      setServerError(isApiError(error) ? error.message : "Unable to save event");
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Admin / Events</p>
          <h2>{mode === "create" ? "Create event" : "Edit event"}</h2>
        </div>
        <Link className="button button--ghost" to="/admin/events">
          Back to list
        </Link>
      </div>
      <form className="editor-layout" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="panel panel--accent">
          <div className="form-grid">
            <FormField label="Title" error={form.formState.errors.title?.message}>
              <input className="input" {...form.register("title")} />
            </FormField>
            <FormField label="Event type" error={form.formState.errors.eventType?.message}>
              <select className="input" {...form.register("eventType")}>
                <option value="movie_screening">Movie screening</option>
                <option value="concert">Concert</option>
                <option value="theater">Theater</option>
                <option value="standup">Standup</option>
                <option value="sport">Sport</option>
              </select>
            </FormField>
            <FormField label="Start datetime" error={form.formState.errors.startDatetime?.message}>
              <input className="input" type="datetime-local" {...form.register("startDatetime")} />
            </FormField>
            <FormField label="End datetime">
              <input className="input" type="datetime-local" {...form.register("endDatetime")} />
            </FormField>
            <FormField label="Venue UUID" hint="The backend has no venue list endpoint, so valid UUIDs must be supplied externally." error={form.formState.errors.venueId?.message}>
              <input className="input monospace" {...form.register("venueId")} />
            </FormField>
            <FormField label="Price" error={form.formState.errors.price?.message}>
              <input className="input" type="number" step="0.01" min="0" {...form.register("price", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Max capacity" error={form.formState.errors.maxCapacity?.message}>
              <input className="input" type="number" min="0" {...form.register("maxCapacity", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Image URL">
              <input className="input" {...form.register("imageUrl")} />
            </FormField>
            <FormField label="Storage path">
              <input className="input" {...form.register("storagePath")} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea className="textarea" rows={8} {...form.register("description")} />
          </FormField>
        </div>
        {serverError ? <div className="alert alert--error">{serverError}</div> : null}
        <div className="button-row">
          <button className="button" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : mode === "create" ? "Create event" : "Save event"}
          </button>
          <Link className="button button--ghost" to="/admin/events">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
