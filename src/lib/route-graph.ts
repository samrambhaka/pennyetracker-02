export type Direction = "north" | "south" | "east" | "west";

export type Edge = {
  src: string;
  tgt: string;
  dir: Direction;
};

export type PathStep = {
  fromId: string;
  toId: string;
  direction: Direction;
};

/** BFS shortest path on a directed graph; returns ordered steps or null. */
export function findPath(
  edges: Edge[],
  startId: string,
  endId: string,
): PathStep[] | null {
  if (startId === endId) return [];
  const adj = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!adj.has(e.src)) adj.set(e.src, []);
    adj.get(e.src)!.push(e);
  }
  const prev = new Map<string, { from: string; dir: Direction }>();
  const queue: string[] = [startId];
  const seen = new Set<string>([startId]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === endId) {
      const steps: PathStep[] = [];
      let node = endId;
      while (prev.has(node)) {
        const p = prev.get(node)!;
        steps.unshift({ fromId: p.from, toId: node, direction: p.dir });
        node = p.from;
      }
      return steps;
    }
    for (const e of adj.get(cur) ?? []) {
      if (seen.has(e.tgt)) continue;
      seen.add(e.tgt);
      prev.set(e.tgt, { from: cur, dir: e.dir });
      queue.push(e.tgt);
    }
  }
  return null;
}

export const DIR_ARROW: Record<Direction, string> = {
  north: "↑ N",
  south: "↓ S",
  east: "→ E",
  west: "← W",
};
