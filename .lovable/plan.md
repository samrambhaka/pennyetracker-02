## Goal

Turn `/map/panchayath` into a multi-view public map with tabs. The current pin-map view stays as the default; two new views are added per your request.

> Note: you mentioned "three features" but listed only two. I'll plan with the two below. If there's a third, tell me and I'll add it.

## Tabs on `/map/panchayath`

```
[ Pin map ] [ Connections ] [ Delivery staff ]
```

### Tab 1 — Pin map (unchanged)
Current Google-Map view with all marked panchayath pins.

### Tab 2 — Connections (panchayath → ward drill-down)
Two sub-modes inside the tab:

- **Panchayath level** (default): N/S/E/W graph using existing `GraphCanvas` with `panchayaths` / `panchayath_connections`. **Read-only** for public visitors — hide the "New", "Add", "Connect existing" actions; clicking a connected neighbour re-centers, same as today.
- **Click center panchayath → Ward level**: switches the same canvas to `wards` / `ward_connections` scoped to that panchayath (`filter: { key: "panchayath_id", value: <id> }`). A breadcrumb `Panchayaths / <Name> wards` with a Back button returns to panchayath level.

### Tab 3 — Delivery staff
Same panchayath N/S/E/W graph, but each panchayath card shows the count of active delivery staff assigned to it (from `delivery_staff_panchayaths` + `delivery_staff` where `status='active'`). Clicking the center panchayath opens a side panel listing the staff (name, phone, assigned wards) — reusing the data shape from `get_public_delivery_partners`.

## Technical details

- New file: `src/routes/map.panchayath.tsx` gets a `<Tabs>` wrapper; existing pin-map body moves into `TabsContent value="pin"`.
- `GraphCanvas` gains a `readOnly?: boolean` prop. When true: hide "New", placeholder "Add"/"Connect existing" buttons, and skip mutations. Default false to keep `/admin/marking/*` and `/admin/mapping/*` unchanged.
- New small component `PublicConnectionsView` wraps `GraphCanvas` and handles the panchayath→ward drill (local state `wardOfPanchayathId`).
- New small component `PublicDeliveryView` wraps `GraphCanvas` in `readOnly`, fetches `get_public_delivery_partners`, and shows count badge on the centered card + side panel on click.
- RLS: `panchayaths` and `wards` are `authenticated`-read only. To keep this public, add `anon` SELECT policies (read-only) for `panchayaths`, `wards`, `panchayath_connections`, `ward_connections` — OR keep the page authenticated. **Decision needed** (see below).
- No DB schema changes; one optional RLS migration.

## Out of scope
- Editing connections from the public page (admin pages keep that).
- Map-overlay polylines on Google Map (graph view only, matches existing marking UI).
- `/map/panchayath`'s pin-map behaviour itself.

## Open question
Should the new Connections + Delivery tabs be publicly viewable (requires adding `anon` read RLS) or require login? Default in this plan: **public read-only** with RLS additions.
