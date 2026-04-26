import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  eventType: z.enum(["movie_screening", "concert", "theater", "standup", "sport"]),
  startDatetime: z.string().min(1, "Start date is required"),
  endDatetime: z.string(),
  venueId: z.string().trim().min(1, "Venue UUID is required"),
  price: z.coerce.number().min(0, "Price must be zero or higher"),
  maxCapacity: z.coerce.number().min(0, "Capacity must be zero or higher"),
  imageUrl: z.string(),
  storagePath: z.string(),
});
