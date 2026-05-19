/**
 * Build a URL that opens the device's default map app for navigation.
 * - On Android, `geo:` opens Google Maps.
 * - On iOS, we use Apple Maps URL (maps://).
 * - On desktop / fallback, we use https://www.google.com/maps/dir/.
 */
export function buildNavigateHref(opts: {
  origin?: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number; name?: string };
}): string {
  const { origin, destination } = opts;
  const dest = `${destination.lat},${destination.lng}`;
  const o = origin ? `${origin.lat},${origin.lng}` : "";

  // Universal Google Maps directions URL — works on web and most mobile.
  const params = new URLSearchParams({
    api: "1",
    destination: dest,
  });
  if (o) params.set("origin", o);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** geo: URI for Android intent — falls through to default map app. */
export function buildGeoUri(d: { lat: number; lng: number; name?: string }): string {
  const q = `${d.lat},${d.lng}${d.name ? `(${encodeURIComponent(d.name)})` : ""}`;
  return `geo:${d.lat},${d.lng}?q=${q}`;
}
