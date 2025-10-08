import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardVersion } from '../store/boardStore';

/* ---------- API calls (cliente) ---------- */

export const listVersions = async (boardId: string): Promise<number[]> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/versions`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to list versions');
  return r.json();
};

export const createVersion = async (boardId: string): Promise<{ ok: boolean; version: number }> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/version`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Failed to create version');
  return r.json();
};

export const restoreVersion = async (
  boardId: string,
  version: number
): Promise<{ ok: boolean; restored: { boardId: string; version: number } }> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/versions/${version}/restore`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Failed to restore version');
  return r.json();
};

export const getCurrentVersion = async (boardId: string): Promise<number | null> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/version/current`, { credentials: 'include' });
  if (!r.ok) return null;
  const data = await r.json();
  const v = Number(data?.version);
  return Number.isFinite(v) ? v : null;
};


export function useBoardVersions(boardId?: string) {
  const [versions, setVersions] = useState<number[]>([]);
  const [current, setCurrent] = useBoardVersion();
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const canUndo = current > 1;
  const canRedo = current >= 1 && current < versions.length;

  const refresh = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [list, curr] = await Promise.all([
        listVersions(boardId),
        getCurrentVersion(boardId),
      ]);

      setVersions(list);

      // Si current no está en la lista, cae al último existente
      if (curr != null && list.includes(curr)) {
        setCurrent(curr);
      } else {
        setCurrent(list.length ? list[list.length - 1] : null);
      }
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const goToVersion = useCallback(
    async (target: number) => {
      if (!boardId || busyRef.current) return;
      if (!versions.includes(target)) return; // sanity
      busyRef.current = true;
      try {
        await restoreVersion(boardId, target);
        setCurrent(target);
      } finally {
        busyRef.current = false;
      }
    },
    [boardId, versions]
  );

  const undo = useCallback(async () => {
    if (!canUndo) return;
    const target = versions[current - 2];
    await goToVersion(target);
  }, [canUndo, current, versions, goToVersion]);

  const redo = useCallback(async () => {
    if (!canRedo) return;
    const target = versions[current];
    await goToVersion(target);
  }, [canRedo, current, versions, goToVersion]);

  const snapshot = useCallback(async () => {
    if (!boardId || busyRef.current) return;
    busyRef.current = true;
    try {
      const { version: newV } = await createVersion(boardId);
      setVersions(prev => {
        if (prev.includes(newV)) return prev;
        const next = [...prev, newV].sort((a, b) => a - b);
        return next;
      });
      setCurrent(newV);
    } finally {
      busyRef.current = false;
    }
  }, [boardId]);

  return {
    versions,         // lista ordenada
    current,          // versión actual (del JSON)
    canUndo, canRedo,
    loading,
    refresh,          // fuerza relectura (por si hay cambios externos)
    undo, redo, snapshot,
    goToVersion,      // por si quieres saltar a una versión concreta desde UI
  };
}
