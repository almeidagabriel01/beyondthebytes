'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TopBarSlotContextType = {
  rightSlot: ReactNode | null;
  setRightSlot: (slot: ReactNode | null) => void;
  onNewAppointment: (() => void) | null;
  setOnNewAppointment: (fn: (() => void) | null) => void;
};

const TopBarSlotContext = createContext<TopBarSlotContextType>({
  rightSlot: null,
  setRightSlot: () => {},
  onNewAppointment: null,
  setOnNewAppointment: () => {},
});

export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  const [rightSlot, setRightSlot] = useState<ReactNode | null>(null);
  const [onNewAppointment, setOnNewAppointmentRaw] = useState<(() => void) | null>(null);

  // Stable identity: wrap fn-state setter so consumers can list it in useEffect deps
  // without retriggering the effect on every Provider render.
  const setOnNewAppointment = useCallback((fn: (() => void) | null) => {
    setOnNewAppointmentRaw(fn ? () => fn : null);
  }, []);

  const value = useMemo(
    () => ({ rightSlot, setRightSlot, onNewAppointment, setOnNewAppointment }),
    [rightSlot, onNewAppointment, setOnNewAppointment],
  );

  return <TopBarSlotContext.Provider value={value}>{children}</TopBarSlotContext.Provider>;
}

export function useTopBarSlot() {
  return useContext(TopBarSlotContext);
}
