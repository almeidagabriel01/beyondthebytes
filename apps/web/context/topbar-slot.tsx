'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

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

  // Wrap in object to avoid React treating the fn as a state updater
  const setOnNewAppointment = (fn: (() => void) | null) => {
    setOnNewAppointmentRaw(fn ? () => fn : null);
  };

  return (
    <TopBarSlotContext.Provider
      value={{ rightSlot, setRightSlot, onNewAppointment, setOnNewAppointment }}
    >
      {children}
    </TopBarSlotContext.Provider>
  );
}

export function useTopBarSlot() {
  return useContext(TopBarSlotContext);
}
