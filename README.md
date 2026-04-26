# Scenee Admin

Admin-only frontend for the `scenee_backend` API.

## Run

```bash
npm install
npm run dev
```

Create a `.env` file if needed:

```bash
VITE_API_BASE_URL=http://192.168.68.150:8000
```

## Notes

- Auth uses `/v1/auth/login` and `/v1/auth/me`
- Admin events intentionally use `/v1admin/events`
- Categories are create-only in the backend, so the UI maintains a local discovered registry
- Event forms require manual `venue_id` input because the backend does not expose a venue list endpoint
