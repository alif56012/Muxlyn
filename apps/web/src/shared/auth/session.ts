import type { authClient } from '@/shared/api/client';

export type Session = NonNullable<ReturnType<typeof authClient.useSession>['data']>;
export type SessionValue = Session | null;
