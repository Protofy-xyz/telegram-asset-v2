import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useTabVisible } from './store/boardStore';
import { API } from 'protobase'

type PanelSide = 'right' | 'left';
type Mode = 'board' | 'json' | 'ui' | 'graph';

interface Controls {
  isJSONView: boolean;
  toggleJson: () => void;

  addOpened: boolean;
  openAdd: () => void;
  setAddOpened: (value: boolean) => void;

  autopilot: boolean;
  toggleAutopilot: () => void;

  setTabVisible: (value: string) => void;
  tabVisible: string;

  viewMode: Mode;
  setViewMode: (mode: Mode) => void;

  saveJson: () => void;

  panelSide: PanelSide;
  setPanelSide: (side: PanelSide) => void;
}

const BoardControlsContext = createContext<Controls | null>(null);
export const useBoardControls = () => useContext(BoardControlsContext)!;
export const BoardControlsProvider: React.FC<{
  boardName: string;
  children: React.ReactNode;
  board: any;
  mode?: Mode;
  addMenu?: 'open' | 'closed';
  dialog?: string;
  autopilotRunning?: boolean;
  rules?: 'open' | 'closed';
}> = ({
  boardName,
  children,
  board,
  mode = 'board',
  addMenu = 'closed',
  dialog = '',
  autopilotRunning = false,
  rules = 'closed',
}) => {
  const [isJSONView, setIsJSONView] = useState(mode === 'json');
  const [addOpened, setAddOpened] = useState(addMenu === 'open');
  const [autopilot, setAutopilot] = useState(autopilotRunning);
  const [tabVisible, setTabVisible] = useTabVisible();

  const isValid = (m: string): m is Mode =>
    m === 'ui' || m === 'board' || m === 'graph' || m === 'json';

  const [viewMode, setViewMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const h = (window.location.hash || '').slice(1);
      if (isValid(h)) return h;
    }
    return 'graph';
  });

  const userForcedRef = useRef(false);
  const initedRef = useRef(false);

  const [panelSide, setPanelSide] = useState<PanelSide>(
    (board?.settings?.panelSide as PanelSide) || 'right'
  );

  const toggleJson = () => setIsJSONView(v => !v);
  const openAdd = () => setAddOpened(true);

  useEffect(() => {
    const h = (window.location.hash || '').slice(1);
    if (isValid(h)) {
      setViewMode(h as Mode);
      userForcedRef.current = true;
    } else {
      history.replaceState(null, '', `#${viewMode}`);
    }
    initedRef.current = true;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const h = (window.location.hash || '').slice(1);
      if (isValid(h)) {
        setViewMode(h as Mode);
        userForcedRef.current = true;
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!initedRef.current) return;
    const current = (window.location.hash || '').slice(1);
    if (current !== viewMode) {
      history.replaceState(null, '', `#${viewMode}`);
    }
  }, [viewMode]);


  useEffect(() => {
    if (!board?.settings?.showBoardUIWhilePlaying) return;
    if (userForcedRef.current) return;
    setViewMode(autopilot ? 'ui' : 'board');
  }, [autopilot, board?.settings?.showBoardUIWhilePlaying]);

  const toggleAutopilot = useCallback(async () => {
    setAutopilot(v => !v);
    await API.get(`/api/core/v1/boards/${boardName}/autopilot/${!autopilot ? 'on' : 'off'}`);
    if (board?.settings?.showBoardUIOnPlay) {
      if (!autopilot) setViewMode('ui');
      if (autopilot) setViewMode('board');
    }
  }, [boardName, autopilot, board?.settings?.showBoardUIOnPlay]);

  const saveJson = () => {};

  return (
    <BoardControlsContext.Provider value={{
      isJSONView, toggleJson,
      addOpened, openAdd, setAddOpened,
      autopilot, toggleAutopilot,
      setTabVisible, tabVisible,
      viewMode, setViewMode,
      saveJson,
      panelSide, setPanelSide,
    }}>
      {children}
    </BoardControlsContext.Provider>
  );
};