import { describe, expect, it } from "vitest";

import { normalizeApiError, normalizePage } from "./api";

describe("normalizePage", () => {
  it("maps backend pagination keys to frontend shape", () => {
    expect(
      normalizePage({
        items: [{ id: 1 }],
        total: 9,
        offset: 3,
        limit: 3,
        has_more: true,
      }),
    ).toEqual({
      items: [{ id: 1 }],
      total: 9,
      offset: 3,
      limit: 3,
      hasMore: true,
    });
  });
});

describe("normalizeApiError", () => {
  it("extracts field errors from 422 detail payloads", () => {
    const error = normalizeApiError(422, {
      detail: [{ loc: ["body", "name"], msg: "field required" }],
    });

    expect(error.status).toBe(422);
    expect(error.fieldErrors).toEqual({ name: "field required" });
  });
});
