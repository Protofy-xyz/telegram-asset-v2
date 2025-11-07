/* ========== Directed Layout “orgánico” (Sugiyama + cruces mínimos + suavizado) ========== */

/** Mediana numérica (para baricentros) */
const median = (arr: number[]) => {
  if (!arr?.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/** Eliminación heurística de ciclos (Eades): genera un orden lineal y separa edges forward/back */
function greedyCycleRemoval(
  nodeIds: string[],
  edges: { source: string; target: string; data?: any }[],
  nodeSet: Set<string>
) {
  // consruimos in/out degree y adyacencias
  const inDeg = new Map(nodeIds.map((id) => [id, 0]));
  const outDeg = new Map(nodeIds.map((id) => [id, 0]));
  const adj = new Map(nodeIds.map((id) => [id, new Set<string>()]));
  const radj = new Map(nodeIds.map((id) => [id, new Set<string>()]));

  for (const e of edges) {
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target) || e?.data?.linkType === 'code') continue;
    adj.get(e.source)!.add(e.target);
    radj.get(e.target)!.add(e.source);
    outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }

  const S = new Set(nodeIds);
  const L: string[] = [];
  const R: string[] = [];

  const remove = (v: string) => {
    S.delete(v);
    for (const t of adj.get(v)!) {
      inDeg.set(t, (inDeg.get(t) || 0) - 1);
      radj.get(t)!.delete(v);
    }
    for (const s of radj.get(v)!) {
      outDeg.set(s, (outDeg.get(s) || 0) - 1);
      adj.get(s)!.delete(v);
    }
  };

  while (S.size) {
    let progress = false;

    // quita sumideros => a la derecha
    for (const v of [...S]) {
      if ((outDeg.get(v) || 0) === 0) {
        remove(v);
        R.push(v);
        progress = true;
      }
    }
    // quita fuentes => a la izquierda
    for (const v of [...S]) {
      if ((inDeg.get(v) || 0) === 0) {
        remove(v);
        L.push(v);
        progress = true;
      }
    }
    if (progress) continue;

    // elige nodo con mayor (out - in)
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const v of S) {
      const score = (outDeg.get(v) || 0) - (inDeg.get(v) || 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    if (best != null) {
      remove(best);
      L.push(best);
    }
  }

  const order = L.concat(R.reverse());
  const index = new Map(order.map((id, i) => [id, i]));

  const forward: typeof edges = [];
  const back: typeof edges = [];

  for (const e of edges) {
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target) || e?.data?.linkType === 'code') continue;
    const iu = index.get(e.source)!;
    const iv = index.get(e.target)!;
    if (iu <= iv) forward.push(e);
    else back.push(e);
  }

  return { order, index, forward, back };
}

/** Reordenación por baricentro en varias pasadas (minimiza cruces) */
function minimizeCrossings(
  layers: string[][],
  preds: Map<string, string[]>,
  succs: Map<string, string[]>,
  baseOrder: Map<string, number>,
  sweeps = 8
) {
  for (let it = 0; it < sweeps; it++) {
    const topDown = it % 2 === 0;

    if (topDown) {
      for (let col = 1; col < layers.length; col++) {
        const prevPos = new Map(layers[col - 1].map((id, i) => [id, i]));
        const scored = layers[col].map((id) => {
          const neigh = (preds.get(id) || []).filter((p) => prevPos.has(p)).map((p) => prevPos.get(p)!);
          const score = neigh.length ? median(neigh) : (baseOrder.get(id) ?? 0);
          return { id, score, has: neigh.length > 0 };
        });
        scored.sort((a, b) =>
          a.has !== b.has ? (a.has ? -1 : 1)
            : a.score !== b.score ? a.score - b.score
              : (baseOrder.get(a.id)! - baseOrder.get(b.id)!)
        );
        layers[col] = scored.map((s) => s.id);
      }
    } else {
      for (let col = layers.length - 2; col >= 0; col--) {
        const nextPos = new Map(layers[col + 1].map((id, i) => [id, i]));
        const scored = layers[col].map((id) => {
          const neigh = (succs.get(id) || []).filter((s) => nextPos.has(s)).map((s) => nextPos.get(s)!);
          const score = neigh.length ? median(neigh) : (baseOrder.get(id) ?? 0);
          return { id, score, has: neigh.length > 0 };
        });
        scored.sort((a, b) =>
          a.has !== b.has ? (a.has ? -1 : 1)
            : a.score !== b.score ? a.score - b.score
              : (baseOrder.get(a.id)! - baseOrder.get(b.id)!)
        );
        layers[col] = scored.map((s) => s.id);
      }
    }
  }
}

/** Asigna Y dentro de cada columna con compacción + relajación hacia baricentro de vecinos */
function assignYPositions(
  layers: string[][],
  preds: Map<string, string[]>,
  succs: Map<string, string[]>,
  sizes: Map<string, { width: number; height: number }>,
  marginY: number
) {
  const y = new Map<string, number>();

  // Paso 1: colocación básica (stack vertical) con objetivo hacia mediana de predecesores
  for (let col = 0; col < layers.length; col++) {
    const ids = layers[col];
    let yOffset = 0;

    for (const id of ids) {
      const sz = sizes.get(id)!;
      const centers = (preds.get(id) || []).filter((p) => y.has(p)).map((p) => y.get(p)! + (sizes.get(p)!.height / 2));
      const targetTop = centers.length ? median(centers) - sz.height / 2 : yOffset;
      const top = Math.max(targetTop, yOffset); // no solape
      y.set(id, top);
      yOffset = top + sz.height + marginY;
    }
  }

  // Paso 2: relajación global (suaviza y hace el layout más “orgánico”):
  // varias pasadas top-down / bottom-up acercando los centros a la mediana de sus vecinos
  const relaxIters = 4;
  for (let it = 0; it < relaxIters; it++) {
    // top-down respecto a pred
    for (let col = 0; col < layers.length; col++) {
      const ids = layers[col];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const sz = sizes.get(id)!;
        const neighC = (preds.get(id) || []).filter((p) => y.has(p)).map((p) => y.get(p)! + sizes.get(p)!.height / 2);
        if (!neighC.length) continue;
        const desiredCenter = median(neighC);
        const desiredTop = desiredCenter - sz.height / 2;

        // muévete suavemente hacia el objetivo
        const current = y.get(id)!;
        const next = current * 0.6 + desiredTop * 0.4;
        y.set(id, next);
      }
      // compacción sin solapes en este layer (hacia abajo)
      let scanTop = 0;
      for (const id of ids) {
        const h = sizes.get(id)!.height;
        const top = Math.max(y.get(id)!, scanTop);
        y.set(id, top);
        scanTop = top + h + marginY;
      }
    }

    // bottom-up respecto a succ
    for (let col = layers.length - 1; col >= 0; col--) {
      const ids = layers[col];
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const sz = sizes.get(id)!;
        const neighC = (succs.get(id) || []).filter((s) => y.has(s)).map((s) => y.get(s)! + sizes.get(s)!.height / 2);
        if (!neighC.length) continue;
        const desiredCenter = median(neighC);
        const desiredTop = desiredCenter - sz.height / 2;

        const current = y.get(id)!;
        const next = current * 0.6 + desiredTop * 0.4;
        y.set(id, next);
      }
      // compacción sin solapes en este layer (hacia arriba)
      let scanBottom = Number.POSITIVE_INFINITY;
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const h = sizes.get(id)!.height;
        const bottom = Math.min(y.get(id)! + h, scanBottom);
        const top = bottom - h;
        y.set(id, top);
        scanBottom = top - marginY;
      }
      // normalizamos para evitar gaps exagerados: otra pasada hacia abajo
      let scanTop = 0;
      for (const id of ids) {
        const h = sizes.get(id)!.height;
        const top = Math.max(y.get(id)!, scanTop);
        y.set(id, top);
        scanTop = top + h + marginY;
      }
    }
  }
  return y;
}

/* =========================================================================================
 * INTERFAZ COMPATIBLE
 * ========================================================================================= */
export const computeDirectedLayout = ({
  cards,
  edges,
  hPixelRatio,
  vPixelRatio,
  marginX = 120,
  marginY = 60,
}: {
  cards: { name: string; width?: number; height?: number }[];
  edges: { source: string; target: string; data?: any }[];
  hPixelRatio: number;
  vPixelRatio: number;
  marginX?: number;
  marginY?: number;
}) => {
  const nodes = (cards || []).filter((c) => c?.name);
  const nodeIds = nodes.map((c) => c.name);
  const nodeSet = new Set(nodeIds);

  // Tamaños (mismo contrato que tu versión)
  const sizeById = new Map<string, { width: number; height: number }>(
    nodes.map((c) => [
      c.name,
      {
        width: (c as any).width ? (c as any).width * hPixelRatio : 2 * hPixelRatio,
        height: (c as any).height ? (c as any).height * vPixelRatio : 7 * vPixelRatio,
      },
    ])
  );

  // Prepara preds/succ solo con edges internos y no 'code'
  const validEdges = (edges || []).filter(
    (e) => nodeSet.has(e.source) && nodeSet.has(e.target) && e?.data?.linkType !== 'code'
  );

  // 1) Elimina ciclos (heurístico) y separa edges forward/back
  const { order, forward } = greedyCycleRemoval(nodeIds, validEdges, nodeSet);

  // 2) Asigna niveles (capas/columnas) con longest-path sobre los forward edges
  const preds = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const succs = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  for (const e of forward) {
    preds.get(e.target)!.push(e.source);
    succs.get(e.source)!.push(e.target);
  }

  const level = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const id of order) {
    const p = preds.get(id)!;
    if (!p.length) {
      level.set(id, 0);
    } else {
      let best = 0;
      for (const u of p) best = Math.max(best, (level.get(u) || 0) + 1);
      level.set(id, best);
    }
  }

  // 3) Capas (columnas) horizontales
  const maxLevel = Math.max(0, ...level.values());
  const layers: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const id of nodeIds) layers[level.get(id)!].push(id);

  // 4) Cruces mínimos: sweeps de baricentros arriba/abajo
  const baseOrder = new Map<string, number>(nodeIds.map((id, i) => [id, i]));
  minimizeCrossings(layers, preds, succs, baseOrder, 8);

  // 5) Asignación Y con compacción y relajación orgánica
  const yMap = assignYPositions(layers, preds, succs, sizeById, marginY);

  // 6) Asignación X por columnas (apilado horizontal), columna = max width acumulado
  const nodeX = new Map<string, number>();
  const nodeY = yMap;

  let xOffset = 0;
  for (let col = 0; col < layers.length; col++) {
    const ids = layers[col];
    let maxW = 0;
    for (const id of ids) {
      nodeX.set(id, xOffset);
      maxW = Math.max(maxW, sizeById.get(id)!.width);
    }
    xOffset += maxW + marginX;
  }

  // 7) Salida compatible
  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    positions[id] = { x: nodeX.get(id) || 0, y: nodeY.get(id) || 0 };
  }
  return { positions, sizes: sizeById };
};
