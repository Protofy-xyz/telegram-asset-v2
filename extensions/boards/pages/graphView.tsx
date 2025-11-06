import { Tinted } from 'protolib/components/Tinted';
import React, { memo } from 'react';
import { ReactFlow, Background, useNodesState, useEdgesState, Handle, Position } from 'reactflow';

const DefaultNode = memo(({ data }) => (
    <div
        style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bgPanel)',
            color: 'var(--color)'
        }}
    >
        {data.name}
        {/* 🔽 añade puntos de conexión */}
        <Handle type="source" position={Position.Right} />
        <Handle type="target" position={Position.Left} />
    </div>
));

const nodeTypes = { default: DefaultNode };

const Flow = ({ initialNodes, initialEdges }) => {
    // ✅ aquí está la clave
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    return (
        <Tinted>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}   // ✅ necesario
                onEdgesChange={onEdgesChange}   // ✅ necesario si quieres mover edges
                fitView
                fitViewOptions={{ padding: 0.2 }}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
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

export const GraphView = ({ board }) => {
    const hPixelRatio = 150;
    const vPixelRatio = 30;

    let prevX = 0;
    let prevY = 0;
    let maxRowHeight = 0;
    let margin = 50;

    const initialNodes = board.cards
        .filter((card) => card.layer === 'base' || !card.layer)
        .map((card, index) => {
            const cardWidth = (card.width || 2) * hPixelRatio;
            const cardHeight = (card.height || 7) * vPixelRatio;
            const obj = {
                id: card.name,
                type: 'default',
                position: { x: prevX, y: prevY },
                data: card,
                style: {
                    border: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    width: cardWidth + 'px',
                    height: cardHeight + 'px',
                    background: 'transparent'
                },
            }
            maxRowHeight = Math.max(maxRowHeight, cardHeight);
            prevX += cardWidth + margin;
            if (prevX > 800) {
                prevX = 0;
                prevY += maxRowHeight + margin;
                maxRowHeight = 0;
            }

            return obj
        });

    const initialEdges = [{ id: 'a->b', source: 'a', target: 'b' }];
    console.log('Initial Nodes:', initialNodes);
    console.log('Initial Edges:', initialEdges);
    return <Flow initialEdges={initialEdges} initialNodes={initialNodes} />;
};