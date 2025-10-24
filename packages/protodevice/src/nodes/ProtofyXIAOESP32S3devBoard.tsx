import { useContext } from "react";
import { PORT_TYPES, Node, FlowStoreContext } from "protoflow";
import { Handle, Position, useEdges } from "reactflow";
import { getColor } from ".";

// --- helpers -----------------------------

const isHandleConnected = (edges: any[], handleId: string) =>
  edges.find((e) => e.targetHandle == handleId || e.sourceHandle == handleId);

// Types that fit your data shape
type HandleSide = "left" | "right" | "top" | "bottom";

type Port = {
  number: number;
  side: HandleSide;
  name: string;
  type: string;
  analog: boolean;
  description: string;
  maxVoltage: number;
  rtc: boolean;
  nodeRendering?: {
    position?: { x?: number; y?: number }; // pixels
    handleSide?: HandleSide;
  };
  [k: string]: any;
};

type PortWithPosition = Port & {
  position: {
    top?: number;     // style.top (px)
    left?: number;    // style.left (px)
    bottom?: number;  // style.bottom (px)
    right?: number;   // style.right (px)
    side: Position;   // React Flow handle side
  };
};

/**
 * calculatePortPositions:
 * - Uses per-port nodeRendering.position.{x,y} + nodeRendering.handleSide.
 * - Supports "left", "right", "top", "bottom".
 */
const calculatePortPositions = (ports: Port[]): PortWithPosition[] => {
  return ports.map((port) => {
    const nr = port.nodeRendering;
    const handleSide: HandleSide = nr?.handleSide ?? port.side ?? "right";

    let side: Position;
    switch (handleSide) {
      case "left":
        side = Position.Left;
        break;
      case "right":
        side = Position.Right;
        break;
      case "top":
        side = Position.Top;
        break;
      case "bottom":
        side = Position.Bottom;
        break;
      default:
        side = Position.Right;
    }

    const x = nr?.position?.x;
    const y = nr?.position?.y;

    // Position logic: keep both x and y for all sides
    const position = { left: x, top: y, side };

    return { ...port, position };
  });
};

// Render handles using positions computed above
const renderHandles = (portsWithPositions: PortWithPosition[], edges: any[], id: string) => {
  return portsWithPositions.map((port, i) => {
    const idString = `${id}${PORT_TYPES.data}element-${i + 2}`;
    const { top, side, left } = port.position;

    const description = {
      name: port.name,
      type: port.type,
      description: port.description,
      maxVoltage: port.maxVoltage,
      rtc: port.rtc,
    };

    const connected = isHandleConnected(edges, idString);

    let style: any = {
      position: "absolute",
      width: "25px",
      height: "25px",
      backgroundColor: connected ? "#BA68C8" : "white",
      border: connected ? "2px solid #BA68C8" : "2px solid white",
    };

    switch (side) {
      case Position.Left:
        style.top = `${top ?? 0}px`;
        style.left = left !== undefined ? `${left}px` : "10px";
        break;
      case Position.Right:
        style.top = `${top ?? 0}px`;
        style.right = "10px";
        break;
      case Position.Top:
        style.left = `${left ?? 0}px`;
        style.top = `${top ?? 10}px`; // use y directly if provided
        break;
      case Position.Bottom:
        style.left = `${left ?? 0}px`;
        // if y is provided, interpret as offset from top (so use top instead of bottom)
        if (typeof top === "number") {
          style.top = `${top}px`;
        } else {
          style.bottom = "10px";
        }
        break;
    }

    return (
      <Handle
        key={i}
        isConnectable={!connected}
        isValidConnection={(c) => !isHandleConnected(edges, c.sourceHandle)}
        type="target"
        title={JSON.stringify(description, null, 2)}
        style={style}
        position={side}
        id={idString}
      />
    );
  });
};

// --- component -----------------------------

const ProtofyXIAOESP32S3devBoard = ({ node = {}, nodeData = {}, topics = {}, color }: any) => {
  const { id } = node;
  const useFlowsStore = useContext(FlowStoreContext);
  const setNodeData = useFlowsStore((state: any) => state.setNodeData);

  const edges = useEdges();
  const metadata = useFlowsStore((state: any) => state.metadata);
  const ports: Port[] = metadata.board.ports;

  // Compute positions (ONLY from nodeRendering)
  const portsWithPositions = calculatePortPositions(ports);

  // Preserve your devicePositioning init (unchanged behavior)
  const devicePositioning = Array(ports.length)
    .fill(1)
    .map((x, i) => `${i + 2}-${i > ports.length / 2 - 1 ? "l" : "r"}-${i}`);

  if (!nodeData._devicePositioning) {
    setNodeData(node.id, { ...nodeData, _devicePositioning: devicePositioning });
  }

  return (
    <Node
      output={false}
      skipCustom={true}
      node={node}
      color={color}
      isPreview={!id}
      title="Protofy XIAO ESP32S3 devBoard"
      id={id}
      margin="200px"
    >
      <div style={{ marginTop: "20px", marginBottom: "80px" }}>
        <img
          src={"/public/images/device/ProtofyXIAOdevBoard.png"}
          style={{ width: "100%" }}
        />
        <div
          style={{
            margin: "70px auto 0",
            width: "90%",
            height: "160px",
            padding: "24px 20px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.1)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#555",
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            Virtual ports
          </div>
        </div>


      </div>

      {renderHandles(portsWithPositions, edges as any[], id)}
    </Node>
  );
};

export default {
  id: "protofyXIAOESP32S3devBoard",
  type: "ArrayLiteralExpression",
  check: (node: any, nodeData: any) =>
    node.type == "ArrayLiteralExpression" &&
    nodeData["element-1"] == '"Protofy XIAO ESP32S3 devBoard"',
  getComponent: (node: any, nodeData: any, children: any) => (
    <ProtofyXIAOESP32S3devBoard
      color={getColor("protofyXIAOESP32S3devBoard")}
      node={node}
      nodeData={nodeData}
      children={children}
    />
  ),
  getInitialData: () => {
    return { to: '"protofyXIAOESP32S3devBoard"' };
  },
  hidden: true,
  nonDeletable: true,
};
