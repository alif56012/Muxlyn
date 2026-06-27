import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginPage } from '@/features/auth/pages/login';

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    error: z.string().optional(),
    return_to: z.string().optional(),
    redirect: z.string().optional(),
  }),
  component: LoginPage,
});
