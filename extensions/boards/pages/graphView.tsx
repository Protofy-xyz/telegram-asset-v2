import React, { memo } from 'react';
import { ReactFlow, Background, useNodesState, useEdgesState } from 'reactflow';

const DefaultNode = memo(({ data }) => {
  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {data.label}
    </div>
  );
});

const nodeTypes = { default: DefaultNode };

const Flow = ({ initialNodes, initialEdges }) => {
  // ✅ aquí está la clave
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
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
  );
};

export const GraphView = ({ board }) => {
  const hPixelRatio = 150;
  const vPixelRatio = 30;

  const initialNodes = board.cards
    .filter((card) => card.layer === 'base' || !card.layer)
    .map((card, index) => ({
      id: card.name,
      type: 'default',
      position: { x: index * 550, y: 0 },
      data: { label: card.name },
      style: {
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        width: (card.width || 2) * hPixelRatio + 'px',
        height: (card.height || 7) * vPixelRatio + 'px',
      },
    }));

  const initialEdges = [{ id: 'b->c', source: 'b', target: 'c' }];

  return <Flow initialEdges={initialEdges} initialNodes={initialNodes} />;
};