import { X, Save, Plus, Pause, Play, Activity, Settings, Presentation, LayoutDashboard, Book, Code, UserPen, Bot } from 'lucide-react';
import { useBoardControls } from './BoardControlsContext';
import { ActionBarButton } from 'protolib/components/ActionBarWidget';
import { Separator } from '@my/ui';
import { useSubscription } from 'protolib/lib/mqtt';
import { useEffect, useRef, useState } from 'react';

const AutopilotButton = ({ generateEvent, autopilot }) => <ActionBarButton
  tooltipText={autopilot ? "Pause Autopilot" : "Play Autopilot"}
  beating={autopilot}
  fill={true}
  Icon={autopilot ? Pause : Play}
  iconProps={{ ml: autopilot ? 0 : 2, fill: "var(--bgPanel)", color: "var(--bgPanel)" }}
  onPress={() => generateEvent({ type: "toggle-autopilot" })}
  hoverStyle={{ scale: 1.05 }}
  bc={autopilot ? 'var(--color8)' : "var(--color)"}
  br={"$20"}
/>

const LogsButton = ({ selected, onPress, showDot }: { selected: boolean; onPress: () => void; showDot: boolean }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    <ActionBarButton tooltipText="Logs" selected={selected} Icon={Activity} onPress={onPress} />
    {showDot && (
      <span
        aria-label="hay errores recientes"
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'red',
          boxShadow: '0 0 0 2px var(--bgPanel)',
        }}
      />
    )}
  </div>
);

const getActionBar = (generateEvent) => {
  // Suscripción a errores nivel 50
  const coreError = useSubscription('logs/core/50');
  const apiError = useSubscription('logs/api/50');

  // Estado/temporizador del indicador
  const [showLogsDot, setShowLogsDot] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDot = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowLogsDot(true);
    timeoutRef.current = setTimeout(() => setShowLogsDot(false), 10_000); // 10s
  };

  useEffect(() => {
    if (!coreError?.onMessage) return;
    const unsubscribe = coreError.onMessage((_msg: any) => {
      // cualquier mensaje en logs/core/50 es un error nivel 50
      triggerDot();
      // opcional: console.log("Core error message received:", _msg);
    });
    return () => unsubscribe?.();
  }, [coreError?.onMessage]);

  useEffect(() => {
    if (!apiError?.onMessage) return;
    const unsubscribe = apiError.onMessage((_msg: any) => {
      // cualquier mensaje en logs/api/50 es un error nivel 50
      triggerDot();
      // opcional: console.log("API error message received:", _msg);
    });
    return () => unsubscribe?.();
  }, [apiError?.onMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const { isJSONView, autopilot, setViewMode, viewMode, tabVisible } = useBoardControls();

  const bars = {
    'JSONView': [
      <ActionBarButton Icon={X} iconProps={{ color: 'var(--gray9)' }} onPress={() => generateEvent({ type: "toggle-json" })} />,
      <ActionBarButton Icon={Save} onPress={() => generateEvent({ type: "save-json" })} />
    ],
    'BoardView': [
      <ActionBarButton tooltipText="Add Card" Icon={Plus} onPress={() => generateEvent({ type: "open-add" })} />,
      <ActionBarButton tooltipText={tabVisible == "rules" ? "Close Automations" : "Open Automations"} selected={tabVisible == "rules"} Icon={Bot} onPress={() => generateEvent({ type: "toggle-rules" })} />,
      <ActionBarButton tooltipText={tabVisible == "states" ? "Close States" : "Open States"} selected={tabVisible == "states"} Icon={Book} onPress={() => generateEvent({ type: "toggle-states" })} />,
      <AutopilotButton generateEvent={generateEvent} autopilot={autopilot} />,
      <LogsButton selected={tabVisible == "logs"} showDot={showLogsDot} onPress={() => generateEvent({ type: "toggle-logs" })} />,
      <ActionBarButton tooltipText="Board Settings" selected={tabVisible == "board-settings"} Icon={Settings} onPress={() => generateEvent({ type: "board-settings" })} />,
      <>
        <Separator vertical borderColor="var(--gray7)" h="30px" />
        <ActionBarButton tooltipText="Presentation Mode" selected={viewMode === "ui"} Icon={Presentation} onPress={() => setViewMode(viewMode === "ui" ? "board" : "ui")} />
      </>,
    ],
    'uiView': [
      <ActionBarButton tooltipText="Code" selected={tabVisible == "uicode"} Icon={Code} onPress={() => generateEvent({ type: "toggle-uicode" })} />,
      <ActionBarButton tooltipText={"Visual UI (Beta)"} selected={tabVisible == "visualui"} Icon={UserPen} onPress={() => generateEvent({ type: "toggle-visualui" })} />,
      <ActionBarButton tooltipText={tabVisible == "states" ? "Close States" : "Open States"} selected={tabVisible == "states"} Icon={Book} onPress={() => generateEvent({ type: "toggle-states" })} />,
      <AutopilotButton generateEvent={generateEvent} autopilot={autopilot} />,
      <>
        <Separator vertical borderColor="var(--gray8)" h="30px" ml="$2.5" />
        <ActionBarButton tooltipText="Board Mode" Icon={LayoutDashboard} onPress={() => setViewMode(viewMode === "ui" ? "board" : "ui")} />
      </>,
    ]
  };

  return isJSONView
    ? bars['JSONView']
    : viewMode === 'ui' ? bars['uiView'] : bars['BoardView'];
};

export default getActionBar;
