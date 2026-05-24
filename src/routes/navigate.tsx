import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Navigation, Locate } from "lucide-react";
import { buildNavigateHref } from "@/lib/map-link";

export const Route = createFileRoute("/navigate")({
  component: NavigatePage,
  head: () => ({
    meta: [
      { title: "Map Navigation — Penny-eTracker" },
      { name: "description", content: "Open turn-by-turn directions in your device's map app." },
    ],
  }),
});

type Node = { id: string; name: string; latitude: number | null; longitude: number | null; panchayath_id?: string };
type Level = "panchayath" | "ward";

function NavigatePage() {
  const [level, setLevel] = useState<Level>("panchayath");
  const [panchayathId, setPanchayathId] = useState<string | null>(null);
  const [wardId, setWardId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: panchayaths = [] } = useQuery({
    queryKey: ["all-panchayaths"],
    queryFn: async (): Promise<Node[]> => {
      const { data, error } = await (supabase as any)
        .from("panchayaths").select("id,name,latitude,longitude").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: wards = [] } = useQuery({
    queryKey: ["all-wards"],
    queryFn: async (): Promise<Node[]> => {
      const { data, error } = await (supabase as any)
        .from("wards").select("id,name,latitude,longitude,panchayath_id").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredWards = useMemo(
    () => (panchayathId ? wards.filter((w) => w.panchayath_id === panchayathId) : []),
    [wards, panchayathId],
  );

  const dest = useMemo<Node | null>(() => {
    if (level === "panchayath") return panchayaths.find((p) => p.id === panchayathId) ?? null;
    return wards.find((w) => w.id === wardId) ?? null;
  }, [level, panchayathId, wardId, panchayaths, wards]);

  const ready = !!(dest?.latitude != null && dest?.longitude != null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-12">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/landing"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[oklch(0.3_0.12_220)] px-5 py-4 text-white shadow-md">
          <div className="rounded-lg bg-white/15 p-2">
            <Navigation className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Map Navigation</h1>
        </div>

        <Card className="mt-6 space-y-4 p-4 sm:p-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Destination
            </h3>
            <Tabs value={level} onValueChange={(v) => { setLevel(v as Level); setWardId(null); }}>
              <TabsList>
                <TabsTrigger value="panchayath">Panchayath</TabsTrigger>
                <TabsTrigger value="ward">Ward</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Select
            value={panchayathId ?? ""}
            onValueChange={(v) => { setPanchayathId(v); setWardId(null); }}
          >
            <SelectTrigger><SelectValue placeholder="Select panchayath…" /></SelectTrigger>
            <SelectContent>
              {panchayaths.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {level === "ward" && (
            <Select value={wardId ?? ""} onValueChange={setWardId} disabled={!panchayathId}>
              <SelectTrigger>
                <SelectValue placeholder={panchayathId ? "Select ward…" : "Pick panchayath first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredWards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
              <Locate className="h-4 w-4" /> {origin ? "Update my location" : "Use my location"}
            </Button>
            {origin && (
              <span className="text-xs text-muted-foreground">
                {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
              </span>
            )}
          </div>

          {dest && !ready && (
            <p className="text-xs text-muted-foreground">
              This {level} has no saved coordinates yet. Mark it on the Marking page to enable navigation.
            </p>
          )}

          <Button asChild disabled={!ready} className="w-full" size="lg">
            {ready ? (
              <a
                href={buildNavigateHref({
                  origin,
                  destination: { lat: dest!.latitude!, lng: dest!.longitude!, name: dest!.name },
                })}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="h-5 w-5" /> Open in Maps
              </a>
            ) : (
              <span>
                <Navigation className="h-5 w-5" /> Open in Maps
              </span>
            )}
          </Button>
        </Card>
      </div>
    </main>
  );
}
