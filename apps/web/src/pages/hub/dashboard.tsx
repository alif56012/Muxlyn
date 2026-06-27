import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { registry } from '@/hub/core/plugin-registry';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function DashboardPage() {
  const { t } = useTranslation();
  const cards = registry.getDashboardCards();

  if (cards.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">{t('dashboard.empty')}</p>
            <Link to="/hub">
              <Button variant="outline">{t('dashboard.setup_connections')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Suspense
            key={card.order}
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            }
          >
            <card.component connection={null} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
