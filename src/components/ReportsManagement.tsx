import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, Home, Building2, MapPin, Route, Users, User, FileText, Bell, BookOpen, Navigation, Clock, MessageSquare, Navigation2, Waypoints, ClipboardList, GitBranch, Car, ShieldPlus, LogOut, Settings, ChevronDown, LayoutDashboard, BarChart3, FileBarChart, TrendingUp, Activity, AlertTriangle, Mail, MailOpen, Send, Inbox, FileSpreadsheet } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Navigation structure
const navigationItems = [
  {
    id: 'general',
    label: 'General',
    icon: LayoutDashboard,
    items: [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'hubs', label: 'Hubs', icon: Building2 },
      { id: 'stops', label: 'Stops', icon: MapPin },
      { id: 'nearby-spots', label: 'Nearby Spots', icon: MapPin },
      { id: 'requests', label: 'Requests', icon: ClipboardList },
    ]
  },
  {
    id: 'transnet',
    label: 'Transnet',
    icon: Route,
    items: [
      { id: 'routes', label: 'Routes', icon: Route },
      { id: 'route-stops', label: 'Route Stops', icon: Navigation2 },
      { id: 'stop-routes', label: 'Stop Routes', icon: GitBranch },
      { id: 'hub-routes', label: 'Hub Routes', icon: Waypoints },
      { id: 'drivers', label: 'Drivers', icon: Car },
      { id: 'journeys', label: 'Journeys', icon: Navigation },
      { id: 'journey-messages', label: 'Journey Messages', icon: MessageSquare },
      { id: 'stop-waiting', label: 'Stop Waiting', icon: Clock },
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { id: 'reports-dashboard', label: 'Reports Dashboard', icon: BarChart3 },
      { id: 'user-reports', label: 'User Reports', icon: User },
      { id: 'journey-reports', label: 'Journey Reports', icon: TrendingUp },
      { id: 'driver-reports', label: 'Driver Reports', icon: Car },
      { id: 'hub-reports', label: 'Hub Reports', icon: Building2 },
      { id: 'route-reports', label: 'Route Reports', icon: Route },
      { id: 'performance-reports', label: 'Performance Reports', icon: Activity },
      { id: 'incident-reports', label: 'Incident Reports', icon: AlertTriangle },
      { id: 'analytics', label: 'Analytics', icon: FileBarChart },
      { id: 'email-reports', label: 'Email Reports', icon: Mail },
      { id: 'notification-reports', label: 'Notification Reports', icon: Bell },
      { id: 'email-logs', label: 'Email Logs', icon: MailOpen },
      { id: 'email-templates', label: 'Email Templates', icon: FileSpreadsheet },
      { id: 'scheduled-reports', label: 'Scheduled Reports', icon: Send },
      { id: 'report-subscriptions', label: 'Report Subscriptions', icon: Inbox },
      
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldPlus,
    adminOnly: true,
    items: [
      { id: 'admin', label: 'Admin Dashboard', icon: ShieldPlus },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    items: [
      { id: 'blogs', label: 'Blogs', icon: FileText },
      { id: 'documentation', label: 'Documentation', icon: BookOpen },
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
    ]
  }
];

const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  // Check if a tab is active (including sub-items)
  const isTabActive = (navItem: any) => {
    if (navItem.id === activeTab) return true;
    if (navItem.items) {
      return navItem.items.some((item: any) => item.id === activeTab);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        {/* Main navigation bar */}
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="lg:hidden">
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                      <div className="p-4 border-b">
                        <h1 className="text-lg font-bold">Uthutho Portal</h1>
                        <p className="text-xs text-muted-foreground">Transport Management</p>
                      </div>
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                          {navigationItems
                            .filter(item => !item.adminOnly || userRole === 'admin')
                            .map((item) => (
                              <div key={item.id} className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                  <item.icon className="h-4 w-4" />
                                  <span className="font-semibold text-sm">{item.label}</span>
                                </div>
                                <div className="pl-6 space-y-1">
                                  {item.items.map((subItem) => (
                                    <Button
                                      key={subItem.id}
                                      variant={activeTab === subItem.id ? "default" : "ghost"}
                                      className="w-full justify-start h-9 text-sm"
                                      onClick={() => {
                                        onTabChange(subItem.id);
                                        setMobileOpen(false);
                                      }}
                                    >
                                      <subItem.icon className="w-4 h-4 mr-3" />
                                      {subItem.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="hidden lg:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Uthutho Portal
                  </h1>
                  <p className="text-xs text-muted-foreground">Transport Management System</p>
                </div>
              </div>

              {/* Desktop Navigation Dropdowns */}
              <nav className="hidden lg:flex items-center space-x-1">
                {navigationItems
                  .filter(item => !item.adminOnly || userRole === 'admin')
                  .map((item) => (
                    <DropdownMenu 
                      key={item.id} 
                      open={openDropdown === item.id}
                      onOpenChange={(open) => setOpenDropdown(open ? item.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={isTabActive(item) ? "default" : "ghost"}
                          className="h-9 gap-1"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.items.map((subItem) => (
                          <DropdownMenuItem
                            key={subItem.id}
                            onClick={() => {
                              onTabChange(subItem.id);
                              setOpenDropdown(null);
                            }}
                            className={activeTab === subItem.id ? "bg-accent" : ""}
                          >
                            <subItem.icon className="mr-2 h-4 w-4" />
                            {subItem.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))}
              </nav>
            </div>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 h-9 px-3 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onTabChange('profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;