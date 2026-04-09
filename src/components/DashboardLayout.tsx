
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Home, Building2, MapPin, Route, Users, User, FileText, BookOpen, Navigation, Clock, MessageSquare, Navigation2, Waypoints, ClipboardList, GitBranch, Car } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'hubs', label: 'Hubs', icon: Building2 },
    { id: 'stops', label: 'Stops', icon: MapPin },
    { id: 'reports', label: 'Reports', icon: MapPin },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'route-stops', label: 'Route Stops', icon: Navigation2 },
    { id: 'stop-routes', label: 'Stop Routes', icon: GitBranch },
    { id: 'hub-routes', label: 'Hub Routes', icon: Waypoints },
    { id: 'drivers', label: 'Drivers', icon: Car },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stop-waiting', label: 'Stop Waiting', icon: Clock },
    { id: 'journeys', label: 'Journeys', icon: Navigation },
    { id: 'journey-messages', label: 'Journey Messages', icon: MessageSquare },
    { id: 'blogs', label: 'Blogs', icon: FileText },
    { id: 'documentation', label: 'Documentation', icon: BookOpen },
    { id: 'nearby-spots', label: 'Nearby Spots', icon: MapPin },
    { id: 'requests', label: 'Requests', icon: ClipboardList },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-background"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-foreground">
              Uthutho Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Transport Management System
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    activeTab === item.id 
                      ? 'transport-button-primary' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t text-center text-xs text-muted-foreground">
            Uthutho Management Portal v1.0
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
