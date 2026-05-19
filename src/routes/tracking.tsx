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
import { ArrowLeft, ArrowRight, Navigation, MapPin, Route as RouteIcon } from "lucide-react";
import { findPath, DIR_ARROW, type Edge, type Direction } from "@/lib/route-graph";
import { haversineKm, formatKm } from "@/lib/geo";
import { buildNavigateHref } from "@/lib/map-link";

export const Route = createFileRoute("/tracking")({
  component: TrackingPage,
  head: () => ({
    meta: [
      { title: "Location Tracking — Penny-eTracker" },
      {
        name: "description",
        content:
          "Find the connected directional path and distance between any two panchayaths or wards.",
      },
    ],
  }),
});

type Level = "panchayath" | "ward";
type Pick = { level: Level; panchayathId: string | null; wardId: string | null };

type Node = { id: string; name: string; latitude: number | null; longitude: number | null; panchayath_id?: string };

function TrackingPage() {
  const [from, setFrom] = useState<Pick>({ level: "panchayath", panchayathId: null, wardId: null });
  const [to, setTo] = useState<Pick>({ level: "panchayath", panchayathId: null, wardId: null });
  const [computed, setComputed] = useState<{ from: Pick; to: Pick } | null>(null);

  const { data: panchayaths = [] } = useQuery({
    queryKey: ["all-panchayaths"],
    queryFn: async (): Promise<Node[]> => {
      const { data, error } = await (supabase as any)
        .from("panchayaths")
        .select("id,name,latitude,longitude")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: wards = [] } = useQuery({
    queryKey: ["all-wards"],
    queryFn: async (): Promise<Node[]> => {
      const { data, error } = await (supabase as any)
        .from("wards")
        .select("id,name,latitude,longitude,panchayath_id")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pEdges = [] } = useQuery({
    queryKey: ["panchayath_connections-all"],
    queryFn: async (): Promise<Edge[]> => {
      const { data, error } = await (supabase as any)
        .from("panchayath_connections")
        .select("source_panchayath_id,target_panchayath_id,direction");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        src: r.source_panchayath_id,
        tgt: r.target_panchayath_id,
        dir: r.direction as Direction,
      }));
    },
  });

  const { data: wEdges = [] } = useQuery({
    queryKey: ["ward_connections-all"],
    queryFn: async (): Promise<Edge[]> => {
      const { data, error } = await (supabase as any)
        .from("ward_connections")
        .select("source_ward_id,target_ward_id,direction");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        src: r.source_ward_id,
        tgt: r.target_ward_id,
        dir: r.direction as Direction,
      }));
    },
  });

  const pById = useMemo(() => Object.fromEntries(panchayaths.map((p) => [p.id, p])), [panchayaths]);
  const wById = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w])), [wards]);

  const result = useMemo(() => {
    if (!computed) return null;
    const { from: f, to: t } = computed;
    const fid = f.level === "panchayath" ? f.panchayathId : f.wardId;
    const tid = t.level === "panchayath" ? t.panchayathId : t.wardId;
    if (!fid || !tid) return null;

    let pathLabel: { name: string; dir?: Direction }[] | null = null;

    if (f.level === "ward" && t.level === "ward") {
      const steps = findPath(wEdges, fid, tid);
      if (steps) {
        pathLabel = [{ name: wById[fid]?.name ?? "?" }];
        for (const s of steps) pathLabel.push({ name: wById[s.toId]?.name ?? "?", dir: s.direction });
      }
    } else if (f.level === "panchayath" && t.level === "panchayath") {
      const steps = findPath(pEdges, fid, tid);
      if (steps) {
        pathLabel = [{ name: pById[fid]?.name ?? "?" }];
        for (const s of steps) pathLabel.push({ name: pById[s.toId]?.name ?? "?", dir: s.direction });
      }
    } else {
      // mixed: hop on panchayath graph between parent panchayaths
      const fp = f.level === "ward" ? wById[fid]?.panchayath_id : fid;
      const tp = t.level === "ward" ? wById[tid]?.panchayath_id : tid;
      if (fp && tp) {
        const steps = findPath(pEdges, fp, tp);
        if (steps) {
          pathLabel = [];
          if (f.level === "ward") pathLabel.push({ name: `${wById[fid]?.name} (ward)` });
          pathLabel.push({ name: pById[fp]?.name ?? "?", dir: f.level === "ward" ? undefined : undefined });
          for (const s of steps) pathLabel.push({ name: pById[s.toId]?.name ?? "?", dir: s.direction });
          if (t.level === "ward") pathLabel.push({ name: `${wById[tid]?.name} (ward)` });
        }
      }
    }

    const src = f.level === "ward" ? wById[fid] : pById[fid];
    const dst = t.level === "ward" ? wById[tid] : pById[tid];
    let distanceKm: number | null = null;
    if (
      src?.latitude != null && src?.longitude != null &&
      dst?.latitude != null && dst?.longitude != null
    ) {
      distanceKm = haversineKm(
        { lat: src.latitude, lng: src.longitude },
        { lat: dst.latitude, lng: dst.longitude },
      );
    }

    return { src, dst, pathLabel, distanceKm };
  }, [computed, pEdges, wEdges, pById, wById]);

  const canFind = (from.level === "panchayath" ? from.panchayathId : from.wardId) &&
    (to.level === "panchayath" ? to.panchayathId : to.wardId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-12">
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/landing"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[oklch(0.25_0.08_260)] px-5 py-4 text-white shadow-md">
          <div className="rounded-lg bg-white/15 p-2">
            <RouteIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Location Tracking</h1>
        </div>

        <Card className="mt-6 p-4 sm:p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <PickerColumn label="From" value={from} onChange={setFrom} panchayaths={panchayaths} wards={wards} />
            <PickerColumn label="To" value={to} onChange={setTo} panchayaths={panchayaths} wards={wards} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button disabled={!canFind} onClick={() => setComputed({ from, to })}>
              Find route
            </Button>
          </div>
        </Card>

        {computed && result && (
          <Card className="mt-6 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Result</h2>
            {result.pathLabel ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {result.pathLabel.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {step.dir && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                        {DIR_ARROW[step.dir]}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No connected route found between these on the N/S/E/W graph.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-sm">
              {result.distanceKm != null ? (
                <div>
                  <span className="text-muted-foreground">Straight-line distance:</span>{" "}
                  <span className="font-semibold">{formatKm(result.distanceKm)}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Distance unavailable — set map coordinates for both locations on the marking page.
                </p>
              )}
              {result.src?.latitude != null && result.dst?.latitude != null && (
                <Button asChild size="sm" className="ml-auto">
                  <a
                    href={buildNavigateHref({
                      origin: { lat: result.src.latitude!, lng: result.src.longitude! },
                      destination: {
                        lat: result.dst.latitude!,
                        lng: result.dst.longitude!,
                        name: result.dst.name,
                      },
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation className="h-4 w-4" /> Open in Maps
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function PickerColumn({
  label,
  value,
  onChange,
  panchayaths,
  wards,
}: {
  label: string;
  value: Pick;
  onChange: (v: Pick) => void;
  panchayaths: Node[];
  wards: Node[];
}) {
  const filteredWards = value.panchayathId
    ? wards.filter((w) => w.panchayath_id === value.panchayathId)
    : [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
        <Tabs
          value={value.level}
          onValueChange={(v) => onChange({ ...value, level: v as Level, wardId: null })}
        >
          <TabsList className="h-8">
            <TabsTrigger value="panchayath" className="h-6 text-xs">Panchayath</TabsTrigger>
            <TabsTrigger value="ward" className="h-6 text-xs">Ward</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Select
        value={value.panchayathId ?? ""}
        onValueChange={(v) => onChange({ ...value, panchayathId: v, wardId: null })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select panchayath…" />
        </SelectTrigger>
        <SelectContent>
          {panchayaths.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.level === "ward" && (
        <Select
          value={value.wardId ?? ""}
          onValueChange={(v) => onChange({ ...value, wardId: v })}
          disabled={!value.panchayathId}
        >
          <SelectTrigger>
            <SelectValue placeholder={value.panchayathId ? "Select ward…" : "Pick panchayath first"} />
          </SelectTrigger>
          <SelectContent>
            {filteredWards.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
