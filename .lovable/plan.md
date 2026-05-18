## Goal

On `/marking`, keep the existing N/S/E/W graph marking (it's not lost — it lives on `/marking/panchayath` and `/marking/ward`) and add a **Map** tab for picking geo-coordinates on a Leaflet/OpenStreetMap. All three live on one page as tabs.

## New layout for `/marking`

```text
/marking
├── Tab: Panchayath   (existing N/S/E/W graph)
├── Tab: Ward         (existing N/S/E/W graph, scoped per panchayath)
└── Tab: Map pick     (Leaflet + OSM, sub-tabs: Panchayath | Ward)
```

The current hub cards page (`marking.index.tsx`) becomes a tabbed page. The two child routes (`/marking/panchayath`, `/marking/ward`) stay as deep-links and reuse the same components, so nothing existing breaks.

## Map tab behaviour

- Map: Leaflet via `react-leaflet` + OpenStreetMap tiles. No API key, no billing.
- Sub-tabs inside the Map tab: **Panchayath** and **Ward**.
- **Panchayath sub-tab**: dropdown of panchayaths → click on map to drop a pin → "Save" writes lat/lng to that panchayath row. Existing pins shown as markers; clicking one re-centers and lets you move it.
- **Ward sub-tab**: pick a panchayath, then a ward → click map to drop pin → save to that ward row. Map auto-centers on the parent panchayath's pin if set.
- "My location" button to center the map on the browser's geolocation.
- Search box (OSM Nominatim, no key) to jump to a place by name.

## Database additions

Add `latitude` and `longitude` columns to both `panchayaths` and `wards` (nullable `double precision`). Migration only — RLS policies stay as they are.

## Files

- **Modify** `src/routes/marking.index.tsx` → tabbed UI (`shadcn/ui Tabs`):
  - Tab 1 imports the panchayath graph component
  - Tab 2 imports the ward graph component (with the panchayath picker we already built)
  - Tab 3 is the new Map picker
- **Extract** the body of `marking.panchayath.tsx` and `marking.ward.tsx` into small reusable components in `src/components/marking/` so both the tab and the standalone routes render the same UI.
- **New** `src/components/marking/MapPicker.tsx` — the Leaflet map + sub-tabs + save logic.
- **Install** `leaflet` and `react-leaflet` (plus `@types/leaflet`).
- **DB migration**: `alter table panchayaths add column latitude double precision, add column longitude double precision;` (and same on `wards`).

## What stays the same

- The N/S/E/W graph marking is fully preserved — same `GraphCanvas` component, same behaviour, just now reachable from a tab as well as the existing routes.
- The ward-scope-per-panchayath logic we just added stays.
- No auth/role changes.

## Open assumption

The route lives at `/marking` (not `/admin/mapping`) since the existing graph marking already lives there and isn't admin-gated. If you want it moved/duplicated under `/admin/mapping` with admin auth instead, say so and I'll adjust before implementing.
