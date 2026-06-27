import { Outlet } from '@tanstack/react-router';
import { useState } from 'react';
import { Footer } from './footer';
import { Header } from './header';
import { PluginErrorBoundary } from './plugin-error-boundary';
import { Sidebar } from './sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('muxlyn-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('muxlyn-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
        />
        <main className="flex-1 overflow-auto">
          <PluginErrorBoundary>
            <Outlet />
          </PluginErrorBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
}
