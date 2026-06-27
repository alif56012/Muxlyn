import { Outlet } from '@tanstack/react-router';
import { Footer } from './footer';
import { TopNav } from './top-nav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
