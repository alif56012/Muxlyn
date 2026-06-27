import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { eventBus } from '@/shared/core/event-bus';
import { registry } from '@/shared/core/plugin-registry';
import type { HubContextValue } from '@/shared/core/types';

const HubContext = createContext<HubContextValue | null>(null);

interface HubProviderProps extends Partial<HubContextValue> {
  children: ReactNode;
}

function HubProvider({
  children,
  activeJiraConnection,
  activeGoogleConnection,
  locale,
  setLocale,
  t,
  session,
}: HubProviderProps) {
  const value = useMemo<HubContextValue>(
    () => ({
      registry,
      events: eventBus,
      activeJiraConnection: activeJiraConnection ?? null,
      activeGoogleConnection: activeGoogleConnection ?? null,
      locale: locale ?? 'en',
      setLocale: setLocale ?? (() => {}),
      t: t ?? ((key: string) => key),
      session: session ?? null,
    }),
    [activeJiraConnection, activeGoogleConnection, locale, setLocale, t, session],
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) {
    throw new Error('useHub() must be used within <HubProvider>');
  }
  return ctx;
}

export { HubProvider, useHub };
