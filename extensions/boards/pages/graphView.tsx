import { Tinted } from 'protolib/components/Tinted';
import React, { memo, useCallback, useEffect } from 'react';
import { computeDirectedLayout } from '../utils/graph';
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
const GROUP_PADDING = 100; // padding lateral/inferior
const GROUP_HEADER_HEIGHT = 60; // altura de la cabecera
const GROUP_PAD_TOP = GROUP_PADDING + GROUP_HEADER_HEIGHT; // padding superior total
const GROUP_BG = 'rgba(0,0,0,0.04)'; // gris muy suave y semi-transparente
const GROUP_BORDER = '2px solid var(--gray6)';
const LAYER_VERTICAL_GAP = 200; // separación vertical entre layers (grupos o base)
const BASE_LAYER_IN_GROUP = true; // si true, la layer 'base' también va en grupo

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
        backgroundColor: 'var(--bgPanel)',
        textAlign: 'left',
        alignItems: 'flex-start',
        color: 'var(--color)',
        position: 'relative',
      }}
    >
      {/* {data.name} */}
      {data.content}
      {/* Handles distribuidos verticalmente */}
      {data?.ports?.inputs?.map((port, index) => (
        <Handle
          key={`in-${port}-${index}`}
          id={`input-${index}`}
          type="target"
          position={Position.Left}
          style={{ top: `${((index + 1) * 100) / (inCount + 1)}%` }}
        />
      ))}

      {data?.ports?.outputs?.map((port, index) => (
        <Handle
          key={`out-${port}-${index}`}
          id={`output-${index}`}
          type="source"
          position={Position.Right}
          style={{ top: `${((index + 1) * 100) / (outCount + 1)}%` }}
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
          padding: '0 12px',
          fontSize: GROUP_HEADER_HEIGHT * 0.4,
          fontWeight: 600,
          color: 'var(--gray11)',
          background: 'var(--bgPanel)',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          pointerEvents: 'none',
        }}
      >
        {data?.label}
      </div>
    </div>
  );
});

const nodeTypes = { default: DefaultNode, layerGroup: LayerGroupNode };

/* ========== ReactFlow Wrapper con sincronización automática ========== */
const Flow = ({ initialNodes, initialEdges }) => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 🔄 sincroniza cuando cambian desde fuera (no se pierde viewport)
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // tamaño numérico del nodo
  const getNodeSize = (n) => {
    const sw = typeof n?.style?.width === 'string'
      ? parseFloat(n.style.width)
      : (typeof n?.style?.width === 'number' ? n.style.width : undefined);
    const sh = typeof n?.style?.height === 'string'
      ? parseFloat(n.style.height)
      : (typeof n?.style?.height === 'number' ? n.style.height : undefined);
    return { width: sw ?? 300, height: sh ?? 210 };
  };

  // auto‑resize de grupos al mover hijos
  const autoSizeGroupNodes = useCallback((nds) => {
    const next = nds.map((n) => ({ ...n, style: { ...(n.style || {}) } }));
    const groups = next.filter((n) => n.type === 'layerGroup');
    if (!groups.length) return next;

    for (const g of groups) {
      const children = next.filter((n) => n.parentNode === g.id);
      if (!children.length) continue;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of children) {
        const { width, height } = getNodeSize(c);
        minX = Math.min(minX, c.position.x);
        minY = Math.min(minY, c.position.y);
        maxX = Math.max(maxX, c.position.x + width);
        maxY = Math.max(maxY, c.position.y + height);
      }

      const shiftX = minX - GROUP_PADDING;
      const shiftY = minY - GROUP_PAD_TOP;
      if (shiftX !== 0 || shiftY !== 0) {
        g.position = { x: (g.position?.x || 0) + shiftX, y: (g.position?.y || 0) + shiftY };
        for (const c of children) {
          c.position = { x: c.position.x - shiftX, y: c.position.y - shiftY };
        }
        minX = GROUP_PADDING;
        minY = GROUP_PAD_TOP;
      }

      const RIGHT_MARGIN_EXTRA = 60;
      g.style.width  = (maxX - minX) + GROUP_PADDING * 2 + RIGHT_MARGIN_EXTRA;
      g.style.height = (maxY - minY) + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT;
    }
    return next;
  }, []);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => autoSizeGroupNodes(applyNodeChanges(changes, nds)));
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
const getInitialEdgesFromBoard = (cards) => {
  const nodeIds = new Set(cards.map((c) => c.name));
  const edges = [];
  const duplicateCounter = new Map();
  const seenOutIdx = new Map();
  const seenInIdx = new Map();

  for (const card of cards) {
    const links = Array.isArray(card.links) ? card.links : [];
    for (const link of links) {
      const targetName = link?.name;
      if (!targetName || !nodeIds.has(targetName)) continue;

      const baseKey = `${card.name}->${targetName}`;
      const dup = duplicateCounter.get(baseKey) ?? 0;
      duplicateCounter.set(baseKey, dup + 1);
      const edgeId = dup === 0 ? baseKey : `${baseKey}#${dup}`;

      const outIdx = seenOutIdx.get(card.name) ?? 0;
      const inIdx  = seenInIdx.get(targetName) ?? 0;
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
          stroke: linkType === 'pre'
            ? 'var(--edgePre, var(--color9))'
            : 'var(--edgePost, var(--color9))',
          strokeWidth: 2,
        },
      });
    }
  }
  return edges;
};



/* ========== Main Graph View ========== */
export const GraphView = ({ cards }) => {
  const hPixelRatio = 200;
  const vPixelRatio = 50;

  // agrupar por layer
  const grouped = new Map();
  for (const card of cards || []) {
    const layer = card.layer || 'base';
    if (!grouped.has(layer)) grouped.set(layer, []);
    grouped.get(layer).push(card);
  }

  const initialEdges = getInitialEdgesFromBoard(cards);
  const initialNodes = [];
  const groupNodes = [];
  let yOffsetLayer = 0;

  for (const [layerName, cardsGroup] of grouped.entries()) {
    const { positions, sizes } = computeDirectedLayout({
      cards: cardsGroup,
      edges: initialEdges,
      hPixelRatio,
      vPixelRatio,
      marginX: 120,
      marginY: 60,
    });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of cardsGroup) {
      const sz = sizes.get(c.name);
      const pos = positions[c.name];
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + sz.width);
      maxY = Math.max(maxY, pos.y + sz.height);
    }

    const layerWidth  = Math.max(0, maxX - minX);
    const layerHeight = Math.max(0, maxY - minY);
    const isBaseLayer = !BASE_LAYER_IN_GROUP && layerName === 'base';

    if (!isBaseLayer) {
      const groupId = `group-${layerName}`;
      const RIGHT_MARGIN_EXTRA = 60;
      const groupWidth  = layerWidth + GROUP_PADDING * 2 + RIGHT_MARGIN_EXTRA;
      const groupHeight = layerHeight + GROUP_PAD_TOP + GROUP_PADDING * 2 + 20;

      groupNodes.push({
        id: groupId,
        type: 'layerGroup',
        position: { x: 0, y: yOffsetLayer },
        data: { label: layerName },
        style: { width: groupWidth, height: groupHeight },
      });

      for (const c of cardsGroup) {
        const sz = sizes.get(c.name);
        const pos = positions[c.name];
        initialNodes.push({
          id: c.name,
          type: 'default',
          parentNode: groupId,
          position: {
            x: (pos.x - minX) + GROUP_PADDING,
            y: (pos.y - minY) + GROUP_PAD_TOP,
          },
          data: {
            ...c,
            ports: {
              inputs: initialEdges.filter((e) => e.target === c.name).map((e) => e.source),
              outputs: initialEdges.filter((e) => e.source === c.name).map((e) => e.target),
            },
          },
          style: {
            width: `${sz.width}px`,
            height: `${sz.height}px`,
            background: 'transparent',
          },
        });
      }

      yOffsetLayer += groupHeight + LAYER_VERTICAL_GAP;
    } else {
      for (const c of cardsGroup) {
        const sz = sizes.get(c.name);
        const pos = positions[c.name];
        initialNodes.push({
          id: c.name,
          type: 'default',
          position: { x: pos.x, y: pos.y + yOffsetLayer },
          data: {
            ...c,
            ports: {
              inputs: initialEdges.filter((e) => e.target === c.name).map((e) => e.source),
              outputs: initialEdges.filter((e) => e.source === c.name).map((e) => e.target),
            },
          },
          style: {
            width: `${sz.width}px`,
            height: `${sz.height}px`,
            background: 'transparent',
          },
        });
      }
      yOffsetLayer += layerHeight + LAYER_VERTICAL_GAP;
    }
  }

  return <Flow initialNodes={[...groupNodes, ...initialNodes]} initialEdges={initialEdges} />;
};
