import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginCallbackPage } from '@/features/auth/pages/login-callback';

export const Route = createFileRoute('/login/callback')({
  validateSearch: z.object({
    error: z.string().optional(),
    return_to: z.string().optional(),
  }),
  component: LoginCallbackPage,
});
