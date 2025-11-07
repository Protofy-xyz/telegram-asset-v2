/* ========== Directed Layout con baricentro (orgánico) ========== */

// mediana numérica
const median = (arr) => {
  if (!arr?.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

export const computeDirectedLayout = ({
  cards,
  edges,
  hPixelRatio,
  vPixelRatio,
  marginX = 120,
  marginY = 60,
}) => {
  const nodes = (cards || []).filter((c) => c?.name);
  const nodeIds = nodes.map((c) => c.name);
  const nodeSet = new Set(nodeIds);

  // tamaños
  const sizeById = new Map(
    nodes.map((c) => [
      c.name,
      { width: (c.width || 2) * hPixelRatio, height: (c.height || 7) * vPixelRatio },
    ])
  );

  // grafos internos
  const preds = new Map(nodeIds.map((id) => [id, []]));
  const succs = new Map(nodeIds.map((id) => [id, []]));
  const indeg = new Map(nodeIds.map((id) => [id, 0]));

  for (const e of edges) {
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue; // sólo internos
    preds.get(e.target).push(e.source);
    succs.get(e.source).push(e.target);
    indeg.set(e.target, indeg.get(e.target) + 1);
  }

  // niveles por Kahn (con fallback en ciclos)
  const queue = nodeIds.filter((id) => indeg.get(id) === 0);
  const level = new Map(nodeIds.map((id) => [id, 0]));
  const visited = new Set(queue);

  while (queue.length) {
    const id = queue.shift();
    for (const nxt of succs.get(id) || []) {
      indeg.set(nxt, indeg.get(nxt) - 1);
      level.set(nxt, Math.max(level.get(nxt), level.get(id) + 1));
      if (indeg.get(nxt) === 0 && !visited.has(nxt)) {
        queue.push(nxt);
        visited.add(nxt);
      }
    }
  }
  // nodos en ciclos: colócalos al final de su mejor estimación
  for (const id of nodeIds) {
    if (!visited.has(id)) level.set(id, Math.max(level.get(id), 0));
  }

  // capas (columnas)
  const maxLevel = Math.max(0, ...level.values());
  const layers = Array.from({ length: maxLevel + 1 }, () => []);
  for (const id of nodeIds) layers[level.get(id)].push(id);

  // orden estable inicial por nombre/entrada
  const baseOrder = new Map(nodeIds.map((id, i) => [id, i]));

  const nodeX = new Map();
  const nodeY = new Map();
  let xOffset = 0;

  for (let col = 0; col < layers.length; col++) {
    let ids = layers[col];

    // ordenar por baricentro respecto a predecesores ya colocados
    if (col > 0) {
      const scored = ids.map((id) => {
        const centers = (preds.get(id) || [])
          .filter((p) => nodeY.has(p))
          .map((p) => (nodeY.get(p) ?? 0) + (sizeById.get(p)?.height ?? 0) / 2);
        return {
          id,
          hasPred: centers.length > 0,
          score: centers.length ? median(centers) : baseOrder.get(id) ?? 0,
        };
      });

      scored.sort((a, b) => {
        if (a.hasPred !== b.hasPred) return a.hasPred ? -1 : 1;
        if (a.score !== b.score) return a.score - b.score;
        return (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0);
      });

      ids = scored.map((s) => s.id);
    } else {
      ids = [...ids].sort((a, b) => (baseOrder.get(a) ?? 0) - (baseOrder.get(b) ?? 0));
    }

    // colocación vertical: cerca del objetivo (mediana de preds) + evitar solape
    let yOffset = 0;
    let maxW = 0;

    for (const id of ids) {
      const sz = sizeById.get(id);
      const centers = (preds.get(id) || [])
        .filter((p) => nodeY.has(p))
        .map((p) => (nodeY.get(p) ?? 0) + (sizeById.get(p)?.height ?? 0) / 2);

      const targetTop = centers.length ? median(centers) - sz.height / 2 : yOffset;
      const top = Math.max(targetTop, yOffset); // compacción y no solape

      nodeX.set(id, xOffset);
      nodeY.set(id, top);

      yOffset = top + sz.height + marginY;
      maxW = Math.max(maxW, sz.width);
    }

    xOffset += maxW + marginX;
  }

  // salida
  const positions = {};
  for (const id of nodeIds) positions[id] = { x: nodeX.get(id) || 0, y: nodeY.get(id) || 0 };
  return { positions, sizes: sizeById };
};