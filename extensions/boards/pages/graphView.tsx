import { Tinted } from 'protolib/components/Tinted';
import React, { memo, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    applyNodeChanges,
} from 'reactflow';

/* ===========================
 *  Constantes de layout/grupo
 * =========================== */
const GROUP_PADDING = 24;                // padding lateral/inferior
const GROUP_HEADER_HEIGHT = 28;          // altura de la cabecera
const GROUP_PAD_TOP = GROUP_PADDING + GROUP_HEADER_HEIGHT; // padding superior total
const GROUP_BG = 'rgba(0,0,0,0.04)';     // gris muy suave y semi-transparente
const GROUP_BORDER = '1px solid rgba(0,0,0,0.12)';
const LAYER_VERTICAL_GAP = 200;          // separación vertical entre layers (grupos o base)
const BASE_LAYER_IN_GROUP = true;    // si true, la layer 'base' también va en grupo

/* ========== Node UI (nodos de contenido) ========== */
const DefaultNode = memo(({ data }) => {
    const inCount = data?.ports?.inputs?.length ?? 0;
    const outCount = data?.ports?.outputs?.length ?? 0;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bgPanel)',
                color: 'var(--color)',
                position: 'relative',
            }}
        >
            {data.name}

            {/* Handles distribuidos verticalmente */}
            {data?.ports?.inputs?.map((port, index) => (
                <Handle
                    key={`in-${port}-${index}`}
                    id={`input-${index}`}
                    type="target"
                    position={Position.Left}
                    style={{
                        top: `${((index + 1) * 100) / (inCount + 1)}%`,
                    }}
                />
            ))}

            {data?.ports?.outputs?.map((port, index) => (
                <Handle
                    key={`out-${port}-${index}`}
                    id={`output-${index}`}
                    type="source"
                    position={Position.Right}
                    style={{
                        top: `${((index + 1) * 100) / (outCount + 1)}%`,
                    }}
                />
            ))}
        </div>
    );
});

/* ========== Node UI (grupo de layer con cabecera) ========== */
const LayerGroupNode = memo(({ data }) => {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                background: GROUP_BG,
                border: GROUP_BORDER,
                position: 'relative',
                zIndex: 0,
            }}
        >
            {/* Cabecera del grupo */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: GROUP_HEADER_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(0,0,0,0.65)',
                    background: 'rgba(255,255,255,0.6)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    pointerEvents: 'none', // la cabecera no bloquea interacciones con los hijos
                }}
            >
                {data?.label}
            </div>
        </div>
    );
});

const nodeTypes = {
    default: DefaultNode,
    layerGroup: LayerGroupNode,
};

/* ========== ReactFlow Wrapper con auto‑resize de grupos ========== */
const Flow = ({ initialNodes, initialEdges }) => {
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    // Obtiene tamaño numérico de un nodo (prioriza style.width/height en px)
    const getNodeSize = (n) => {
        const sw = typeof n?.style?.width === 'string'
            ? parseFloat(n.style.width)
            : (typeof n?.style?.width === 'number' ? n.style.width : undefined);
        const sh = typeof n?.style?.height === 'string'
            ? parseFloat(n.style.height)
            : (typeof n?.style?.height === 'number' ? n.style.height : undefined);

        const fallbackW = (n?.width && Number(n.width)) || 300;
        const fallbackH = (n?.height && Number(n.height)) || 210;

        return {
            width: sw ?? fallbackW,
            height: sh ?? fallbackH,
        };
    };

    // Recalcula posición/tamaño de nodos tipo "layerGroup" para contener a sus hijos
    const autoSizeGroupNodes = useCallback((nds) => {
        // Copia superficial para no mutar estado anterior
        const next = nds.map((n) => ({ ...n, style: { ...(n.style || {}) } }));

        const groups = next.filter((n) => n.type === 'layerGroup');
        if (groups.length === 0) return next;

        // Índice por id para accesos rápidos
        const byId = new Map(next.map((n) => [n.id, n]));

        for (const g of groups) {
            const children = next.filter((n) => n.parentNode === g.id);
            if (children.length === 0) continue;

            // Bounding relativo al grupo (coord relativas)
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            for (const c of children) {
                const { width, height } = getNodeSize(c);
                minX = Math.min(minX, c.position.x);
                minY = Math.min(minY, c.position.y);
                maxX = Math.max(maxX, c.position.x + width);
                maxY = Math.max(maxY, c.position.y + height);
            }

            // Si algún hijo se fue hacia coords negativas, movemos el grupo y
            // reajustamos posiciones relativas de los hijos para mantener padding.
            const shiftX = minX - GROUP_PADDING;
            const shiftY = minY - GROUP_PAD_TOP; // respeta cabecera + padding

            if (shiftX !== 0 || shiftY !== 0) {
                g.position = {
                    x: (g.position?.x || 0) + shiftX,
                    y: (g.position?.y || 0) + shiftY,
                };

                for (const c of children) {
                    c.position = {
                        x: c.position.x - shiftX,
                        y: c.position.y - shiftY,
                    };
                }
                // Actualizar bounding tras el shift
                minX = GROUP_PADDING;
                minY = GROUP_PAD_TOP;
                // maxX/maxY siguen válidos porque restamos el mismo shift a todos
            }

            const RIGHT_MARGIN_EXTRA = 60; // margen extra a la derecha del grupo

            const newWidth = Math.max(
                0,
                (maxX - minX) + GROUP_PADDING * 2 + RIGHT_MARGIN_EXTRA
            );
            const newHeight = Math.max(
                0,
                (maxY - minY) + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT
            );

            g.style.width = newWidth;
            g.style.height = newHeight;
            // Asegura dimensiones numéricas (ReactFlow acepta números en style)
        }

        return next;
    }, []);

    // Interceptamos cambios en nodos para aplicar auto‑resize de grupos
    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => {
            const updated = applyNodeChanges(changes, nds);
            return autoSizeGroupNodes(updated);
        });
    }, [setNodes, autoSizeGroupNodes]);

    return (
        <Tinted>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                nodesDraggable
                nodesConnectable
                elementsSelectable
                zoomOnScroll
                zoomOnPinch
                panOnDrag
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={20} color="#555" />
            </ReactFlow>
        </Tinted>
    );
};

/* ========== Edge Builder ========== */
/**
 * Construye edges desde board.cards[*].links[]:
 *  - source = card.name
 *  - target = link.name
 *  - link.type ('pre'|'post') colorea y se guarda en edge.data.linkType
 *  - sourceHandle/targetHandle alineados con orden de outputs/inputs
 */
const getInitialEdgesFromBoard = (board) => {
    const cards = Array.isArray(board?.cards)
        ? board.cards.filter((c) => c?.name)
        : [];

    const nodeIds = new Set(cards.map((c) => c.name));
    const edges = [];
    const duplicateCounter = new Map();
    const seenOutIdx = new Map();
    const seenInIdx = new Map();

    for (const card of cards) {
        const links = Array.isArray(card.links) ? card.links : [];
        for (const link of links) {
            const targetName = link?.name;
            if (!targetName) continue;
            if (!nodeIds.has(targetName)) continue;

            const baseKey = `${card.name}->${targetName}`;
            const dup = duplicateCounter.get(baseKey) ?? 0;
            duplicateCounter.set(baseKey, dup + 1);
            const edgeId = dup === 0 ? baseKey : `${baseKey}#${dup}`;

            const outIdx = seenOutIdx.get(card.name) ?? 0;
            const inIdx = seenInIdx.get(targetName) ?? 0;
            seenOutIdx.set(card.name, outIdx + 1);
            seenInIdx.set(targetName, inIdx + 1);

            const linkType = link?.type === 'pre' ? 'pre' : 'post';

            edges.push({
                id: edgeId,
                source: card.name,
                target: targetName,
                sourceHandle: `output-${outIdx}`,
                targetHandle: `input-${inIdx}`,
                type: 'smoothstep',
                data: { linkType },
                style: {
                    stroke:
                        linkType === 'pre'
                            ? 'var(--edgePre, #f59e0b)'
                            : 'var(--edgePost, #22d3ee)',
                    strokeWidth: 2,
                },
            });
        }
    }

    return edges;
};

/* ========== Directed Layout (por subconjunto) ========== */
/**
 * Calcula layout dirigido (izq→der) para un subconjunto de cards.
 * Sólo considera edges **internos** al subconjunto (evita bloquear por dependencias externas).
 */
const computeDirectedLayout = ({
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

  const sizeById = new Map(
    nodes.map((c) => [
      c.name,
      {
        width: (c.width || 2) * hPixelRatio,
        height: (c.height || 7) * vPixelRatio,
      },
    ])
  );

  // Crear relaciones dirigidas internas
  const preds = new Map(nodeIds.map((id) => [id, []]));
  const succs = new Map(nodeIds.map((id) => [id, []]));
  const indeg = new Map(nodeIds.map((id) => [id, 0]));

  for (const e of edges) {
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue;
    preds.get(e.target).push(e.source);
    succs.get(e.source).push(e.target);
    indeg.set(e.target, indeg.get(e.target) + 1);
  }

  // Topological sort
  const queue = nodeIds.filter((id) => indeg.get(id) === 0);
  const level = new Map(nodeIds.map((id) => [id, 0]));
  while (queue.length) {
    const id = queue.shift();
    for (const nxt of succs.get(id) || []) {
      indeg.set(nxt, indeg.get(nxt) - 1);
      level.set(nxt, Math.max(level.get(nxt), level.get(id) + 1));
      if (indeg.get(nxt) === 0) queue.push(nxt);
    }
  }

  // Agrupar por columnas (niveles)
  const maxLevel = Math.max(0, ...level.values());
  const layers = Array.from({ length: maxLevel + 1 }, () => []);
  for (const id of nodeIds) layers[level.get(id)].push(id);

  const nodeX = new Map();
  const nodeY = new Map();
  let xOffset = 0;

  for (let col = 0; col < layers.length; col++) {
    const ids = layers[col];
    let yOffset = 0;
    let maxW = 0;

    for (const id of ids) {
      const sz = sizeById.get(id);

      // Intentar alinear con su(s) predecesor(es)
      const predsOfNode = preds.get(id) || [];
      let targetY = 0;
      if (predsOfNode.length > 0) {
        const avgY =
          predsOfNode
            .map((p) => (nodeY.get(p) ?? 0) + (sizeById.get(p)?.height ?? 0) / 2)
            .reduce((a, b) => a + b, 0) / predsOfNode.length;
        targetY = avgY - sz.height / 2;
      } else {
        targetY = yOffset;
      }

      // Evitar solapamiento vertical con nodos anteriores en la misma columna
      let safeY = targetY;
      for (const otherId of ids) {
        if (!nodeY.has(otherId)) continue;
        const otherY = nodeY.get(otherId);
        const otherH = sizeById.get(otherId).height;
        if (Math.abs(safeY - otherY) < (otherH + marginY)) {
          safeY = otherY + otherH + marginY;
        }
      }

      nodeX.set(id, xOffset);
      nodeY.set(id, safeY);
      yOffset = Math.max(yOffset, safeY + sz.height + marginY);
      maxW = Math.max(maxW, sz.width);
    }

    xOffset += maxW + marginX;
  }

  const positions = {};
  for (const id of nodeIds) {
    positions[id] = { x: nodeX.get(id) || 0, y: nodeY.get(id) || 0 };
  }

  return { positions, sizes: sizeById };
};

/* ========== Main Graph View ========== */
export const GraphView = ({ board }) => {
    const hPixelRatio = 150;
    const vPixelRatio = 30;

    // 1) Agrupar por layer (undefined → 'base')
    const grouped = new Map();
    for (const card of board.cards || []) {
        const layer = card.layer || 'base';
        if (!grouped.has(layer)) grouped.set(layer, []);
        grouped.get(layer).push(card);
    }

    // 2) Edges globales
    const initialEdges = getInitialEdgesFromBoard(board);

    // 3) Crear nodos y grupos
    const initialNodes = [];
    const groupNodes = [];

    let yOffsetLayer = 0;

    for (const [layerName, cards] of grouped.entries()) {
        const { positions, sizes } = computeDirectedLayout({
            cards,
            edges: initialEdges,
            hPixelRatio,
            vPixelRatio,
            marginX: 120,
            marginY: 60,
        });

        // Bounding local de los nodos de esta layer (coords del layout local)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const card of cards) {
            const sz = sizes.get(card.name);
            const pos = positions[card.name];
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + sz.width);
            maxY = Math.max(maxY, pos.y + sz.height);
        }

        const layerWidth = Math.max(0, maxX - minX);
        const layerHeight = Math.max(0, maxY - minY);

        const isBaseLayer = !BASE_LAYER_IN_GROUP && layerName === 'base';

        if (!isBaseLayer) {
            // Crear el nodo "grupo" de esta layer
            const groupId = `group-${layerName}`;
            const groupWidth = layerWidth + GROUP_PADDING * 2 + 60;
            const groupHeight = layerHeight + GROUP_PAD_TOP + GROUP_PADDING * 2 + 20;

            groupNodes.push({
                id: groupId,
                type: 'layerGroup',
                position: { x: 0, y: yOffsetLayer },
                data: { label: layerName },
                style: {
                    width: groupWidth,
                    height: groupHeight,
                    zIndex: 0,
                },
                selectable: true,
                draggable: true,
            });

            // Añadir nodos hijos con posiciones relativas al grupo (respetando padding y cabecera)
            for (const card of cards) {
                const sz = sizes.get(card.name);
                const pos = positions[card.name];

                initialNodes.push({
                    id: card.name,
                    type: 'default',
                    parentNode: groupId,
                    position: {
                        x: (pos.x - minX) + GROUP_PADDING,
                        y: (pos.y - minY) + GROUP_PAD_TOP,
                    },
                    data: {
                        ...card,
                        ports: {
                            inputs: initialEdges
                                .filter((e) => e.target === card.name)
                                .map((e) => e.source),
                            outputs: initialEdges
                                .filter((e) => e.source === card.name)
                                .map((e) => e.target),
                        },
                    },
                    style: {
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        width: `${sz.width}px`,
                        height: `${sz.height}px`,
                        background: 'transparent',
                        zIndex: 1,
                    },
                });
            }

            // Aumentar el offset vertical para la siguiente layer
            yOffsetLayer += groupHeight + LAYER_VERTICAL_GAP;
        } else {
            // Layer "base": sin grupo, pero se respeta un offset vertical para separarla de las siguientes capas
            for (const card of cards) {
                const sz = sizes.get(card.name);
                const pos = positions[card.name];

                initialNodes.push({
                    id: card.name,
                    type: 'default',
                    position: {
                        x: pos.x,
                        y: pos.y + yOffsetLayer,
                    },
                    data: {
                        ...card,
                        ports: {
                            inputs: initialEdges
                                .filter((e) => e.target === card.name)
                                .map((e) => e.source),
                            outputs: initialEdges
                                .filter((e) => e.source === card.name)
                                .map((e) => e.target),
                        },
                    },
                    style: {
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        width: `${sz.width}px`,
                        height: `${sz.height}px`,
                        background: 'transparent',
                        zIndex: 1,
                    },
                });
            }

            // Avanza el offset usando el alto de esta layer "base"
            const baseHeight = layerHeight;
            yOffsetLayer += baseHeight + LAYER_VERTICAL_GAP;
        }
    }

    return (
        <Flow
            initialEdges={initialEdges}
            initialNodes={[...groupNodes, ...initialNodes]}
        />
    );
};