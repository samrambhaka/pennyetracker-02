# Location Tracking — Plan

Wire up the "Location Tracking" card on `/landing` to a new public page that lets anyone pick a source and destination (panchayath or ward, mixed allowed) and see:

1. The directional hop path between them using existing N/S/E/W connections.
2. Straight-line distance (km) between their saved lat/lng.
3. A "Navigate" button that opens the device's default map app (Google Maps on Android, Apple Maps on iOS) using a `geo:` URI with a maps.google.com fallback.

A second card "Map Navigation" on `/landing` jumps straight to the navigation step (pick a single destination → open in device map).

## Pages & routes

- `src/routes/tracking.tsx` — public Location Tracking page (no auth).
  - Two selectors side-by-side: **From** and **To**, each with:
    - Level toggle: Panchayath / Ward
    - Panchayath dropdown (always)
    - Ward dropdown (only when level = Ward, filtered by chosen panchayath)
  - "Find route" button → results panel:
    - **Path**: BFS over N/S/E/W edges showing each hop with direction arrows (e.g. `Ward A → (east) → Ward B → (north) → Ward C`). If no path exists, show "No connected route".
    - **Distance**: Haversine km between source and destination lat/lng. If either is missing coordinates, hide the distance line with a small note.
    - **Navigate** button → opens `geo:lat,lng?q=lat,lng(Name)` with `https://www.google.com/maps/dir/?api=1&origin=...&destination=...` as href fallback.
- `src/routes/navigate.tsx` — public Map Navigation page.
  - Pick a destination (panchayath or ward) → "Open in Maps" button using same geo URI logic. Optional source pin via browser geolocation.

## Landing page wiring (`src/routes/landing.tsx`)

- Set `to: "/tracking"` on the **Location Tracking** card.
- Set `to: "/navigate"` on the **Update Location** card → rename to **Map Navigation** with `Navigation` icon (or add a 5th card if user prefers keeping Update Location separate — defaulting to rename since Update Location is currently inert).

## Data

Reads only — no schema changes. Uses tables already present:
- `panchayaths` (id, name, latitude, longitude)
- `wards` (id, name, panchayath_id, latitude, longitude)
- `panchayath_connections` (source_panchayath_id, target_panchayath_id, direction)
- `ward_connections` (source_ward_id, target_ward_id, direction)

Cross-level routing (panchayath ↔ ward) is resolved by treating a ward as belonging to its parent panchayath: if the source is a ward and the target is a panchayath, BFS on ward edges first inside the source's panchayath, then hop via panchayath edges, then descend into the target. Kept simple: if mixed selection and no direct strategy works, fall back to distance-only.

## Technical details

- Queries via `@tanstack/react-query` + `supabase` client (public, RLS already allows reads on these tables based on existing pages).
- Haversine helper in `src/lib/geo.ts`.
- BFS helper in `src/lib/route-graph.ts` returning `{ nodes: [{id,name,kind}], directions: ["N"|"S"|"E"|"W"] }`.
- Geo URI helper in `src/lib/map-link.ts`:
  ```ts
  geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})
  ```
  with `https://www.google.com/maps/dir/?api=1&...` fallback set as `href` so desktop browsers still work.
- Tailwind + existing shadcn `Select`, `Card`, `Button`, `Tabs` components — no new deps.

## Out of scope

- Live GPS tracking of moving partners.
- Embedded interactive map (user chose device map app).
- Auth gating (page is public).
