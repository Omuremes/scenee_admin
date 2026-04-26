import { describe, expect, it } from "vitest";

import { buildMovieRequestBody } from "./moviePayload";

describe("buildMovieRequestBody", () => {
  const baseValues = {
    name: "Arrival",
    description: "Sci-fi drama",
    isSeries: false,
    duration: 116,
    seasonsCount: 1,
    posterUrl: "https://example.com/poster.jpg",
    actors: ["actor-1"],
    categories: ["cat-1"],
    episodes: [],
  };

  it("returns JSON when there is no poster file", () => {
    const payload = buildMovieRequestBody(baseValues, null);
    expect(payload).toMatchObject({
      name: "Arrival",
      is_series: false,
      poster: "https://example.com/poster.jpg",
    });
  });

  it("returns multipart data when a poster file is provided", () => {
    const payload = buildMovieRequestBody(baseValues, new File(["binary"], "poster.png", { type: "image/png" }));
    expect(payload).toBeInstanceOf(FormData);
    expect((payload as FormData).get("poster")).toBeInstanceOf(File);
  });
});
