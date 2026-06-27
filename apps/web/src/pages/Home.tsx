import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HomePage() {
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    api.getSession().then((res) => {
      if (res.success && res.data) {
        setUser(res.data as { email?: string; name?: string });
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Muxlyn</CardTitle>
          <CardDescription>
            {user ? `Welcome back, ${user.name || user.email}` : 'Sign in to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user ? (
            <Button variant="outline" onClick={() => api.signOut().then(() => setUser(null))}>
              Sign out
            </Button>
          ) : (
            <Button onClick={() => api.signInGoogle()}>Sign in with Google</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
