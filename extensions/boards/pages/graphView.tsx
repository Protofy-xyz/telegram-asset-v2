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

/* =========================================================
 *  Configuración centralizada (ajustable sin tocar más código)
 * ========================================================= */
const CFG = {
    GROUP_PADDING: 100,                  // padding lateral/inferior
    GROUP_HEADER_HEIGHT: 60,             // altura de cabecera
    GROUP_BG: 'rgba(0,0,0,0.04)',        // gris muy suave y semi-transparente
    GROUP_BORDER: '2px solid var(--gray6)',
    LAYER_VERTICAL_GAP: 200,             // separación vertical entre layers
    BASE_LAYER_IN_GROUP: true,           // si true, la layer 'base' también va en grupo
    RIGHT_MARGIN_EXTRA: 60,              // margen a la derecha dentro del grupo
    GROUP_EXTRA_BOTTOM: 20,              // pequeño extra al alto del grupo
    VIEWPORT: { x: -150, y: 0, zoom: 0.35 as number },
    FITVIEW_PADDING: 0.2,
    NODE_DEFAULT_SIZE: { width: 300, height: 210 },
    LAYOUT: {
        hPixelRatio: 200,
        vPixelRatio: 50,
        marginX: 120,
        marginY: 60,
    },
};

/* Derivados de configuración (evita recomputar mágicos) */
const GROUP_PAD_TOP = CFG.GROUP_PADDING + CFG.GROUP_HEADER_HEIGHT;

/* =========================
 *  Tipos ligeros del dominio
 * ========================= */
// Sin añadir imports externos; estos tipos son orientativos.
type Link = { name: string; type?: 'pre' | 'post' | 'code' };
type Card = {
    name: string;
    layer?: string;
    links?: Link[];
    content?: React.ReactNode;
    // ...otros campos que pasan a data
};

type Ports = { inputs: string[]; outputs: string[] };

// React Flow shape mínima para no depender de tipos externos
type RFNode = any;
type RFEdge = any;

/* ========================================
 *  Utilidades genéricas y helpers reutilizables
 * ======================================== */

/** Extrae números de style.width/height, con fallback al tamaño por defecto */
function getNodeNumericSize(n: RFNode): { width: number; height: number } {
    const w = typeof n?.style?.width === 'string'
        ? parseFloat(n.style.width)
        : (typeof n?.style?.width === 'number' ? n.style.width : undefined);

    const h = typeof n?.style?.height === 'string'
        ? parseFloat(n.style.height)
        : (typeof n?.style?.height === 'number' ? n.style.height : undefined);

    return {
        width: w ?? CFG.NODE_DEFAULT_SIZE.width,
        height: h ?? CFG.NODE_DEFAULT_SIZE.height,
    };
}

/** Agrupa las cards por layer preservando el orden de aparición */
function groupByLayer(cards: Card[]): Map<string, Card[]> {
    const grouped = new Map<string, Card[]>();
    for (const c of cards || []) {
        const layer = c.layer || 'base';
        if (!grouped.has(layer)) grouped.set(layer, []);
        grouped.get(layer)!.push(c);
    }
    return grouped;
}

/** Calcula bounding box de un conjunto de tarjetas con posiciones/sizes */
function computeLayerBounds(
    cards: Card[],
    positions: Record<string, { x: number; y: number }>,
    sizes: Map<string, { width: number; height: number }>
) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const c of cards) {
        const sz = sizes.get(c.name)!;
        const pos = positions[c.name]!;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + sz.width);
        maxY = Math.max(maxY, pos.y + sz.height);
    }

    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);

    return { minX, minY, width, height };
}

/** Construye los arrays de puertos de un nodo a partir de la lista de edges inicial */
function buildPortsFor(cardName: string, edges: RFEdge[]): Ports {
    const inputs = edges.filter((e: RFEdge) => e.target === cardName).map((e: RFEdge) => e.source);
    const outputs = edges.filter((e: RFEdge) => e.source === cardName).map((e: RFEdge) => e.target);
    return { inputs, outputs };
}

/* =====================================
 *  Builder de edges a partir de las cards
 * ===================================== */
function buildEdgesFromCards(cards: Card[]): RFEdge[] {
    const nodeIds = new Set(cards.map((c) => c.name));
    const edges: RFEdge[] = [];
    const duplicateCounter = new Map<string, number>();
    const seenOutIdx = new Map<string, number>();
    const seenInIdx = new Map<string, number>();

    console.log('Building edges from cards:', cards);

    
    for (const card of cards) {
        const links = Array.isArray(card.links) ? card.links : [];
        //search inside rulesCode string for executeAction({name: "targetName", ...})
        const regex = /executeAction\(\s*\{\s*name:\s*["']([\w-]+)["']/g;
        let match;
        while ((match = regex.exec(card.rulesCode)) !== null) {
            const targetName = match[1];
            if (!targetName || !nodeIds.has(targetName)) continue;

            links.push({ name: targetName, type: 'code' });
        }

        for (const link of links) {
            const targetName = link?.name;
            if (!targetName || !nodeIds.has(targetName)) continue;

            // id único por par source->target (gestiona duplicados)
            const baseKey = `${card.name}->${targetName}`;
            const dup = duplicateCounter.get(baseKey) ?? 0;
            duplicateCounter.set(baseKey, dup + 1);
            const edgeId = dup === 0 ? baseKey : `${baseKey}#${dup}`;

            // handles distribuidos incrementalmente
            const outIdx = seenOutIdx.get(card.name) ?? 0;
            const inIdx = seenInIdx.get(targetName) ?? 0;
            seenOutIdx.set(card.name, outIdx + 1);
            seenInIdx.set(targetName, inIdx + 1)

            edges.push({
                id: edgeId,
                source: card.name,
                target: targetName,
                sourceHandle: `output-${outIdx}`,
                targetHandle: `input-${inIdx}`,
                type: 'smoothstep',
                data: { linkType: link.type || 'pre' },
                style: {
                    stroke: link.type === 'pre' ? 'var(--edgePre, var(--color9))' : link.type === 'post' ? 'var(--edgePost, var(--color9))' : 'var(--edgeDefault, var(--color5))',
                    strokeWidth: 2,
                },
            });
        }
    }
    return edges;
}

/* =========================================
 *  Componentes UI para nodos (Default y Grupo)
 * ========================================= */
const DefaultNode = memo(({ data }: { data: any }) => {
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
            {data?.ports?.inputs?.map((port: string, index: number) => (
                <Handle
                    key={`in-${port}-${index}`}
                    id={`input-${index}`}
                    type="target"
                    position={Position.Left}
                    style={{ top: `${((index + 1) * 100) / (inCount + 1)}%` }}
                />
            ))}

            {data?.ports?.outputs?.map((port: string, index: number) => (
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

const LayerGroupNode = memo(({ data }: { data: any }) => {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                background: CFG.GROUP_BG,
                border: CFG.GROUP_BORDER,
                position: 'relative',
                zIndex: 0,
            }}
        >
            {/* Cabecera del grupo */}
            <div
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: CFG.GROUP_HEADER_HEIGHT,
                    display: 'flex',
                    padding: '0 12px',
                    fontSize: CFG.GROUP_HEADER_HEIGHT * 0.4,
                    fontWeight: 600,
                    color: 'var(--gray11)',
                    background: 'var(--bgPanel)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    pointerEvents: 'none',
                    alignItems: 'center',
                }}
            >
                {data?.label}
            </div>
        </div>
    );
});

const nodeTypes = { default: DefaultNode, layerGroup: LayerGroupNode };

/* ==========================================
 *  Flow wrapper (sincronización y autosizing)
 * ========================================== */
const Flow = ({ initialNodes, initialEdges }: { initialNodes: RFNode[]; initialEdges: RFEdge[] }) => {
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // 🔄 sincroniza cuando cambian desde fuera (no se pierde viewport)
    useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
    useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

    // auto‑resize de grupos al mover hijos
    const autoSizeGroupNodes = useCallback((nds: RFNode[]) => {
        const next = nds.map((n) => ({ ...n, style: { ...(n.style || {}) } }));
        const groups = next.filter((n) => n.type === 'layerGroup');
        if (!groups.length) return next;

        for (const g of groups) {
            const children = next.filter((n) => n.parentNode === g.id);
            if (!children.length) continue;

            // Bounding box local a la raíz del grupo
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const c of children) {
                const { width, height } = getNodeNumericSize(c);
                minX = Math.min(minX, c.position.x);
                minY = Math.min(minY, c.position.y);
                maxX = Math.max(maxX, c.position.x + width);
                maxY = Math.max(maxY, c.position.y + height);
            }

            // Alinear el bbox al padding interno del grupo
            const shiftX = minX - CFG.GROUP_PADDING;
            const shiftY = minY - GROUP_PAD_TOP;

            if (shiftX !== 0 || shiftY !== 0) {
                g.position = { x: (g.position?.x || 0) + shiftX, y: (g.position?.y || 0) + shiftY };
                for (const c of children) {
                    c.position = { x: c.position.x - shiftX, y: c.position.y - shiftY };
                }
                minX = CFG.GROUP_PADDING;
                minY = GROUP_PAD_TOP;
            }

            // Redimensionar grupo con holgura derecha
            g.style.width = (maxX - minX) + CFG.GROUP_PADDING * 2 + CFG.RIGHT_MARGIN_EXTRA;
            g.style.height = (maxY - minY) + CFG.GROUP_PADDING * 2 + CFG.GROUP_HEADER_HEIGHT;
        }
        return next;
    }, []);

    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => autoSizeGroupNodes(applyNodeChanges(changes, nds)));
    }, [setNodes, autoSizeGroupNodes]);



    const graphBounds = nodes.reduce((bounds, n) => {
        const { width, height } = getNodeNumericSize(n);
        bounds.minX = Math.min(bounds.minX, n.position.x);
        bounds.minY = Math.min(bounds.minY, n.position.y);
        bounds.maxX = Math.max(bounds.maxX, n.position.x + width);
        bounds.maxY = Math.max(bounds.maxY, n.position.y + height);
        return bounds;
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 });

    graphBounds.width = graphBounds.maxX - graphBounds.minX;
    graphBounds.height = graphBounds.maxY - graphBounds.minY;
    
    const { minX, minY, maxX, maxY } = graphBounds;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const zoom = CFG.VIEWPORT.zoom; // o el zoom inicial que desees
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 🔹 fórmula correcta:
    const initialX = (viewportWidth / 2) - graphCenterX * zoom;
    const initialY = (viewportHeight / 2) - graphCenterY * zoom;



    return (
        <Tinted>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitViewOptions={{ padding: CFG.FITVIEW_PADDING }}
                defaultViewport={{ x: initialX + CFG.VIEWPORT.x, y: initialY + CFG.VIEWPORT.y, zoom: CFG.VIEWPORT.zoom }}
                minZoom={0.1}
                maxZoom={2}
                nodesDraggable={false}
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

/* ====================================================
 *  Capa de layout: computa posiciones y materializa nodos
 * ==================================================== */

/** Ejecuta el layout dirigido para una layer y devuelve posiciones y tamaños */
function computeLayerLayout(cardsGroup: Card[], edges: RFEdge[]) {
    const { hPixelRatio, vPixelRatio, marginX, marginY } = CFG.LAYOUT;
    return computeDirectedLayout({
        cards: cardsGroup,
        edges,
        hPixelRatio,
        vPixelRatio,
        marginX,
        marginY,
    }) as {
        positions: Record<string, { x: number; y: number }>;
        sizes: Map<string, { width: number; height: number }>;
    };
}

/** Crea el nodo grupo ('layerGroup') con dimensiones y desplazamiento Y dados */
function createGroupNode(layerName: string, layerWidth: number, layerHeight: number, yOffset: number): RFNode {
    const groupWidth = layerWidth + CFG.GROUP_PADDING * 2 + CFG.RIGHT_MARGIN_EXTRA;
    const groupHeight = layerHeight + GROUP_PAD_TOP + CFG.GROUP_PADDING * 2 + CFG.GROUP_EXTRA_BOTTOM;

    return {
        id: `group-${layerName}`,
        type: 'layerGroup',
        position: { x: 0, y: yOffset },
        data: { label: layerName },
        style: { width: groupWidth, height: groupHeight },
    };
}

/** Materializa nodos de contenido en grupo */
function materializeNodesInGroup(
    cardsGroup: Card[],
    positions: Record<string, { x: number; y: number }>,
    sizes: Map<string, { width: number; height: number }>,
    groupId: string,
    minX: number,
    minY: number,
    edges: RFEdge[],
): RFNode[] {
    return cardsGroup.map((c) => {
        const sz = sizes.get(c.name)!;
        const pos = positions[c.name]!;
        const ports = buildPortsFor(c.name, edges);

        return {
            id: c.name,
            type: 'default',
            parentNode: groupId,
            position: {
                x: (pos.x - minX) + CFG.GROUP_PADDING,
                y: (pos.y - minY) + GROUP_PAD_TOP,
            },
            data: { ...c, ports },
            style: {
                width: `${sz.width}px`,
                height: `${sz.height}px`,
                background: 'transparent',
            },
        };
    });
}

/** Materializa nodos de contenido sin grupo (layer "plana") */
function materializeNodesFlat(
    cardsGroup: Card[],
    positions: Record<string, { x: number; y: number }>,
    sizes: Map<string, { width: number; height: number }>,
    yOffset: number,
    edges: RFEdge[],
): RFNode[] {
    return cardsGroup.map((c) => {
        const sz = sizes.get(c.name)!;
        const pos = positions[c.name]!;
        const ports = buildPortsFor(c.name, edges);

        return {
            id: c.name,
            type: 'default',
            position: { x: pos.x, y: pos.y + yOffset },
            data: { ...c, ports },
            style: {
                width: `${sz.width}px`,
                height: `${sz.height}px`,
                background: 'transparent',
            },
        };
    });
}

/** Devuelve nodos (grupo + contenido) para una layer y el incremento de Y */
function materializeLayerNodes(
    layerName: string,
    cardsGroup: Card[],
    edges: RFEdge[],
    yOffsetLayer: number
): { groupNode?: RFNode; contentNodes: RFNode[]; yIncrement: number } {
    const { positions, sizes } = computeLayerLayout(cardsGroup, edges);
    const { minX, minY, width: layerWidth, height: layerHeight } = computeLayerBounds(cardsGroup, positions, sizes);

    const isBaseLayerFlat = !CFG.BASE_LAYER_IN_GROUP && layerName === 'base';

    if (isBaseLayerFlat) {
        const contentNodes = materializeNodesFlat(cardsGroup, positions, sizes, yOffsetLayer, edges);
        const yIncrement = layerHeight + CFG.LAYER_VERTICAL_GAP;
        return { contentNodes, yIncrement };
    }

    const groupNode = createGroupNode(layerName, layerWidth, layerHeight, yOffsetLayer);
    const contentNodes = materializeNodesInGroup(
        cardsGroup, positions, sizes, groupNode.id, minX, minY, edges
    );
    const yIncrement = groupNode.style.height + CFG.LAYER_VERTICAL_GAP;

    return { groupNode, contentNodes, yIncrement };
}

/* =======================
 *  Componente principal
 * ======================= */
export const GraphView = ({ cards }: { cards: Card[] }) => {
    const initialEdges = buildEdgesFromCards(cards || []);
    const grouped = groupByLayer(cards || []);

    const groupNodes: RFNode[] = [];
    const contentNodes: RFNode[] = [];
    let yOffsetLayer = 0;

    for (const [layerName, cardsGroup] of grouped.entries()) {
        const { groupNode, contentNodes: nodesForLayer, yIncrement } =
            materializeLayerNodes(layerName, cardsGroup, initialEdges, yOffsetLayer);

        if (groupNode) groupNodes.push(groupNode);
        contentNodes.push(...nodesForLayer);
        yOffsetLayer += yIncrement;
    }

    const initialNodes = [...groupNodes, ...contentNodes];
    return <Flow initialNodes={initialNodes} initialEdges={initialEdges} />;
};