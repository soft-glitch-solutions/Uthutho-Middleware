
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, Home, Building2, MapPin, Route, Users, User, FileText, BookOpen, Navigation, Clock, MessageSquare, Navigation2, Waypoints, ClipboardList, GitBranch, Car, ShieldPlus, LogOut, Settings, ChevronDown } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'admin', label: 'Admin', icon: ShieldPlus, adminOnly: true },
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

const SidebarNav = ({ activeTab, onTabChange, onItemClick, userRole }: { activeTab: string; onTabChange: (tab: string) => void; onItemClick?: () => void; userRole: string }) => (
  <ScrollArea className="flex-1">
    <nav className="p-3 space-y-1">
      {navigationItems
        .filter(item => !(item as any).adminOnly || userRole === 'admin')
        .map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start h-9 text-sm ${
              activeTab === item.id 
                ? 'transport-button-primary' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => {
              onTabChange(item.id);
              onItemClick?.();
            }}
          >
            <Icon className="w-4 h-4 mr-3 shrink-0" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  </ScrollArea>
);

const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (roleData) setUserRole(roleData.role);
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const initials = profile
    ? `${(profile.first_name?.[0] || '')}${(profile.last_name?.[0] || '')}`.toUpperCase() || 'U'
    : 'U';

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : userEmail || 'User';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-4 border-b">
                <h1 className="text-lg font-bold text-foreground">Uthutho Portal</h1>
                <p className="text-xs text-muted-foreground">Transport Management</p>
              </div>
              <SidebarNav activeTab={activeTab} onTabChange={onTabChange} onItemClick={() => setMobileOpen(false)} userRole={userRole} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-foreground hidden sm:block">Uthutho Portal</h1>
          <h1 className="text-lg font-bold text-foreground sm:hidden">Uthutho</h1>
        </div>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">{displayName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary w-fit capitalize">
                  {userRole}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTabChange('profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 border-r bg-card flex-col shrink-0">
          <SidebarNav activeTab={activeTab} onTabChange={onTabChange} userRole={userRole} />
          <div className="p-3 border-t text-center text-xs text-muted-foreground">
            Uthutho Portal v1.0
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;