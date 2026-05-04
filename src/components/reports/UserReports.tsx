import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  TrendingUp, 
  Clock, 
  MapPin, 
  BarChart3,
  Users, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Star,
  Calendar,
  Route,
  Train,
  Bus,
  Activity,
  Zap,
  Shield,
  Navigation,
  Flame,
  Gift,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Clock as ClockIcon,
  Map,
  MessageCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Share2,
  User,
  ChevronLeft,
  ChevronRight,
  Home,
  Languages,
  Heart,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  updated_at: string | null;
  avatar_url: string | null;
  preferred_transport: string | null;
  points: number | null;
  titles: string[] | null;
  selected_title: string | null;
  favorites: any[] | null;
  home: string | null;
  preferred_language: string | null;
  fire_count: number | null;
  trips: number | null;
  total_ride_time: number | null;
  favorites_count: number | null;
  total_trips: number | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  earned: boolean;
  progress: number;
  required: number;
}

// ==================== DUMMY TRIP DATA (since no user_trips table) ====================
// This simulates trip data based on profile statistics
const generateDummyTrips = (profile: Profile | null): DummyTrip[] => {
  const totalTrips = profile?.total_trips || profile?.trips || 24;
  const avgRideTime = profile?.total_ride_time ? Math.floor(profile.total_ride_time / Math.max(1, totalTrips)) : 35;
  
  return Array.from({ length: Math.min(totalTrips, 25) }, (_, i) => ({
    id: `trip-${i + 1}`,
    from_location: i % 3 === 0 ? (profile?.home || 'Khayelitsha Station') : i % 2 === 0 ? 'CBD' : 'Mitchells Plain',
    to_location: i % 3 === 0 ? 'CBD' : i % 2 === 0 ? (profile?.home || 'Khayelitsha Station') : 'Century City',
    transport_mode: profile?.preferred_transport || (i % 3 === 0 ? 'taxi' : i % 2 === 0 ? 'bus' : 'train'),
    duration: avgRideTime + (i % 15) - 5,
    distance: 12 + (i % 15),
    cost: 10 + (i % 20),
    points_earned: 30 + (i % 40),
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed'
  }));
};

interface DummyTrip {
  id: string;
  from_location: string;
  to_location: string;
  transport_mode: string;
  duration: number;
  distance: number;
  cost: number;
  points_earned: number;
  created_at: string;
  status: string;
}

// ==================== DUMMY CONTRIBUTION DATA (since no user_contributions table) ====================
const generateDummyContributions = (profile: Profile | null): DummyContribution[] => {
  const fireCount = profile?.fire_count || 5;
  
  return Array.from({ length: Math.min(fireCount + 10, 20) }, (_, i) => ({
    id: `contrib-${i + 1}`,
    type: i < fireCount ? 'safety_alert' : ['waiting_update', 'crowding_report', 'delay_report'][i % 3],
    location: i % 4 === 0 ? (profile?.home || 'Khayelitsha Station') : i % 2 === 0 ? 'CBD Taxi Rank' : 'N2 Highway',
    impact: 15 + (i * 12),
    points_earned: 5 + (i % 15),
    description: `Update #${i + 1}`,
    created_at: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

interface DummyContribution {
  id: string;
  type: string;
  location: string;
  impact: number;
  points_earned: number;
  description: string;
  created_at: string;
}

// ==================== PAGINATION CONFIG ====================
const ITEMS_PER_PAGE = 10;

// ==================== MAIN COMPONENT ====================
const UserReports = () => {
  const [viewMode, setViewMode] = useState<'live' | 'historical'>('live');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Dummy data states (simulating real data from tables)
  const [allTrips, setAllTrips] = useState<DummyTrip[]>([]);
  const [contributions, setContributions] = useState<DummyContribution[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTripsCount, setTotalTripsCount] = useState(0);
  
  // Achievement states
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  
  // Current user ID (in real implementation, get from auth context)
  const userId = 'user-1'; // This should come from your auth context

  // ==================== FETCH FUNCTIONS ====================
  
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
      
      // Update points from profile
      if (data?.points) {
        setTotalPoints(data.points);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
      return null;
    }
  };
  
  // Generate dummy data based on profile
  const generateDataFromProfile = (profileData: Profile | null) => {
    // Generate trips based on profile statistics
    const trips = generateDummyTrips(profileData);
    setAllTrips(trips);
    setTotalTripsCount(trips.length);
    setTotalPages(Math.ceil(trips.length / ITEMS_PER_PAGE));
    
    // Generate contributions based on profile
    const contribs = generateDummyContributions(profileData);
    setContributions(contribs);
    
    return { trips, contribs };
  };
  
  const calculateAchievements = (profileData: Profile | null, trips: DummyTrip[], contribs: DummyContribution[]) => {
    const totalTrips = trips.length;
    const totalContributions = contribs.length;
    const totalImpact = contribs.reduce((sum, c) => sum + (c.impact || 0), 0);
    const uniqueRoutes = new Set(trips.map(t => `${t.from_location}→${t.to_location}`)).size;
    const transportModes = new Set(trips.map(t => t.transport_mode)).size;
    const hasEarlyTrips = trips.some(t => new Date(t.created_at).getHours() < 8);
    const safetyReports = profileData?.fire_count || 0;
    
    const achievementsList: Achievement[] = [
      {
        id: '1',
        title: 'Early Bird',
        description: 'Complete 10 trips before 8 AM',
        icon: Clock,
        earned: hasEarlyTrips && totalTrips >= 10,
        progress: Math.min(100, (totalTrips * 10)),
        required: 10
      },
      {
        id: '2',
        title: 'Route Expert',
        description: 'Travel 10 different routes',
        icon: Map,
        earned: uniqueRoutes >= 10,
        progress: Math.min(100, (uniqueRoutes / 10) * 100),
        required: 10
      },
      {
        id: '3',
        title: 'Community Hero',
        description: 'Help 500 fellow commuters',
        icon: Users,
        earned: totalImpact >= 500,
        progress: Math.min(100, (totalImpact / 500) * 100),
        required: 500
      },
      {
        id: '4',
        title: 'Safety Champion',
        description: 'Report 10 safety alerts',
        icon: Shield,
        earned: safetyReports >= 10,
        progress: Math.min(100, (safetyReports / 10) * 100),
        required: 10
      },
      {
        id: '5',
        title: 'Rainbow Nation',
        description: 'Use all transport modes',
        icon: Route,
        earned: transportModes >= 3,
        progress: (transportModes / 3) * 100,
        required: 3
      },
      {
        id: '6',
        title: 'Points Collector',
        description: 'Earn 1000 points',
        icon: Trophy,
        earned: (profileData?.points || 0) >= 1000,
        progress: Math.min(100, ((profileData?.points || 0) / 1000) * 100),
        required: 1000
      },
      {
        id: '7',
        title: 'Frequent Traveler',
        description: 'Complete 50 trips',
        icon: Navigation,
        earned: totalTrips >= 50,
        progress: Math.min(100, (totalTrips / 50) * 100),
        required: 50
      },
      {
        id: '8',
        title: 'Local Expert',
        description: 'Save 5 favorite locations',
        icon: Heart,
        earned: (profileData?.favorites_count || 0) >= 5,
        progress: Math.min(100, ((profileData?.favorites_count || 0) / 5) * 100),
        required: 5
      }
    ];
    
    setAchievements(achievementsList);
  };
  
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const profileData = await fetchProfile();
      const { trips, contribs } = generateDataFromProfile(profileData);
      calculateAchievements(profileData, trips, contribs);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Get paginated trips
  const getPaginatedTrips = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return allTrips.slice(start, end);
  };
  
  // ==================== HANDLERS ====================
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handleRefresh = async () => {
    setLoading(true);
    await fetchAllData();
    toast.success('Report refreshed');
  };
  
  const handleDownload = () => {
    // Generate CSV report from profile and trip data
    const headers = ['Date', 'From', 'To', 'Mode', 'Duration (min)', 'Distance (km)', 'Points'];
    const csvData = allTrips.map(trip => [
      new Date(trip.created_at).toLocaleDateString(),
      trip.from_location,
      trip.to_location,
      trip.transport_mode,
      trip.duration,
      trip.distance,
      trip.points_earned
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uthutho-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };
  
  // ==================== HELPER COMPONENTS ====================
  const StatCard = ({ title, value, icon: Icon, trend, description, color = 'primary' }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(trend.value)}% {trend.label || 'from last week'}</span>
              </div>
            )}
            {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
          </div>
          <div className={`h-12 w-12 rounded-full bg-${color}/10 flex items-center justify-center`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const TimelineItem = ({ trip, isLast }: { trip: DummyTrip; isLast: boolean }) => (
    <div className="relative pl-8 pb-6">
      {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
      <div className="absolute left-0 top-1">
        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-green-100">
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
      </div>
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{trip.from_location} → {trip.to_location}</p>
            <Badge variant="outline" className="text-xs">
              {new Date(trip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              {trip.transport_mode === 'taxi' && <Bus className="w-3 h-3" />}
              {trip.transport_mode === 'bus' && <Bus className="w-3 h-3" />}
              {trip.transport_mode === 'train' && <Train className="w-3 h-3" />}
              {trip.transport_mode?.charAt(0).toUpperCase() + trip.transport_mode?.slice(1)}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {trip.duration} min
            </span>
            {trip.distance && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {trip.distance} km
              </span>
            )}
            <span>{new Date(trip.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          +{trip.points_earned} pts
        </Badge>
      </div>
    </div>
  );
  
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push(-1);
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push(-1);
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push(-1);
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push(-1);
          pages.push(totalPages);
        }
      }
      return pages;
    };
    
    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </PaginationItem>
            
            {getPageNumbers().map((pageNum, idx) => (
              pageNum === -1 ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => handlePageChange(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            ))}
            
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };
  
  const ProfileInfoCard = () => (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {profile?.selected_title || 'Newbie Explorer'}
                </Badge>
                {profile?.home && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    {profile.home}
                  </Badge>
                )}
                {profile?.preferred_language && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Languages className="w-3 h-3" />
                    {profile.preferred_language}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{profile?.points || 0}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{profile?.total_trips || profile?.trips || 0}</p>
              <p className="text-xs text-muted-foreground">Total Trips</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{profile?.fire_count || 0}</p>
              <p className="text-xs text-muted-foreground">Safety Reports</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{profile?.favorites_count || 0}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </div>
        </div>
        
        {profile?.titles && profile.titles.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Earned Titles</p>
            <div className="flex flex-wrap gap-2">
              {profile.titles.slice(0, 5).map((title, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {title}
                </Badge>
              ))}
              {profile.titles.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.titles.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Calculate derived metrics
  const achievementsEarned = achievements.filter(a => a.earned).length;
  const totalAchievements = achievements.length;
  
  // Most used route
  const routeCounts = allTrips.reduce((acc, trip) => {
    const route = `${trip.from_location} → ${trip.to_location}`;
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostUsedRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0];
  
  // Contribution impact
  const totalImpact = contributions.reduce((sum, c) => sum + (c.impact || 0), 0);
  const contributionsByType = contributions.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Streak calculation (simplified)
  const uniqueDates = [...new Set(allTrips.map(t => new Date(t.created_at).toDateString()))];
  let currentStreak = 0;
  const today = new Date().toDateString();
  if (uniqueDates.includes(today)) {
    currentStreak = 1;
    let checkDate = new Date();
    while (uniqueDates.includes(new Date(checkDate.setDate(checkDate.getDate() - 1)).toDateString())) {
      currentStreak++;
    }
  }
  
  // Weekly activity
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyTrips = allTrips.filter(trip => new Date(trip.created_at) > oneWeekAgo);
  
  // Loading skeleton
  if (loading && !profile) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">My Travel Report</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your journeys, contributions, and achievements
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm text-muted-foreground">Live</span>
            <Switch
              checked={viewMode === 'live'}
              onCheckedChange={(checked) => setViewMode(checked ? 'live' : 'historical')}
            />
            <span className="text-sm text-muted-foreground">Historical</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      
      {/* Real-time Status Indicator */}
      {viewMode === 'live' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Live Mode</span>
          <span className="text-xs text-muted-foreground">Showing real-time updates from the last 5 minutes</span>
        </div>
      )}
      
      {/* Profile Information */}
      <ProfileInfoCard />
      
      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="community">Community Impact</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>
        
        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Trips" 
              value={`${profile?.total_trips || profile?.trips || 0} trips`} 
              icon={Navigation}
              trend={{ value: 12 }}
              description={`${weeklyTrips.length} trips this week`}
              color="primary"
            />
            <StatCard 
              title="Total Ride Time" 
              value={`${profile?.total_ride_time ? Math.floor(profile.total_ride_time / 60) : 0}h ${profile?.total_ride_time ? profile.total_ride_time % 60 : 0}m`} 
              icon={Clock}
              trend={{ value: -8 }}
              description="Based on your history"
              color="blue"
            />
            <StatCard 
              title="Most Used Route" 
              value={mostUsedRoute ? mostUsedRoute[0].split(' → ')[0] : 'Not enough data'} 
              icon={Route}
              description={`${mostUsedRoute ? mostUsedRoute[1] : 0} times`}
              color="purple"
            />
            <StatCard 
              title="Preferred Transport" 
              value={profile?.preferred_transport?.charAt(0).toUpperCase() + profile?.preferred_transport?.slice(1) || 'Not set'} 
              icon={profile?.preferred_transport === 'taxi' ? Bus : profile?.preferred_transport === 'bus' ? Bus : Train}
              description="Your go-to mode"
              color="yellow"
            />
          </div>
          
          {/* Travel Timeline with Pagination */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Travel Timeline
                  <Badge variant="outline" className="ml-2">
                    Page {currentPage} of {totalPages} • {totalTripsCount} total trips
                  </Badge>
                </CardTitle>
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto pr-2">
                {getPaginatedTrips().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trips found. Start your journey today!
                  </div>
                ) : (
                  getPaginatedTrips().map((trip, idx, arr) => (
                    <TimelineItem key={trip.id} trip={trip} isLast={idx === arr.length - 1} />
                  ))
                )}
              </div>
              <PaginationControls />
            </CardContent>
          </Card>
          
          {/* Queue Status History based on home location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Queue Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{profile?.home || 'Your Local Station'} (Morning Peak)</p>
                    <p className="text-xs text-muted-foreground">Based on community reports from your area</p>
                  </div>
                  <Badge variant="default" className="bg-yellow-500">Moderate Queue</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">CBD Taxi Rank (Evening)</p>
                    <p className="text-xs text-muted-foreground">Based on community updates</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Light Queue</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ==================== COMMUNITY IMPACT TAB ==================== */}
        <TabsContent value="community" className="space-y-6">
          {/* Contribution Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Updates Provided" 
              value={contributions.length} 
              icon={MessageCircle}
              description={`${contributionsByType['waiting_update'] || 0} waiting updates`}
              color="blue"
            />
            <StatCard 
              title="Community Impact" 
              value={totalImpact.toLocaleString()} 
              icon={Users}
              description="Commuters helped by your updates"
              color="green"
            />
            <StatCard 
              title="Safety Reports" 
              value={profile?.fire_count || 0} 
              icon={Shield}
              description="Safety alerts flagged"
              color="red"
            />
          </div>
          
          {/* Contribution Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Recent Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contributions.slice(0, 10).map(contribution => (
                  <div key={contribution.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium capitalize">{contribution.type?.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{contribution.location} • {new Date(contribution.created_at).toLocaleDateString()}</p>
                      {contribution.description && (
                        <p className="text-xs text-muted-foreground mt-1">{contribution.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        +{contribution.points_earned} pts
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Helped {contribution.impact} people</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Achievements & Badges ({achievementsEarned}/{totalAchievements})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map(achievement => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.id} className={`p-4 rounded-lg border ${achievement.earned ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${achievement.earned ? 'bg-yellow-400' : 'bg-muted'}`}>
                          <Icon className={`h-5 w-5 ${achievement.earned ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{achievement.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                          {!achievement.earned && (
                            <div className="mt-2">
                              <Progress value={achievement.progress} className="h-1.5" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(achievement.progress)}% complete
                              </p>
                            </div>
                          )}
                          {achievement.earned && (
                            <Badge variant="secondary" className="text-xs mt-2 bg-green-100">
                              ✓ Earned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Crowdsourcing Impact Score */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex h-16 w-16 rounded-full bg-primary/20 items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Community Champion</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Your contributions have helped over {totalImpact.toLocaleString()} fellow commuters make better travel decisions
                </p>
                <div className="flex justify-center gap-4">
                  <Badge variant="default" className="text-sm py-1 px-3">
                    {totalImpact >= 1000 ? 'Top 5% Contributor' : totalImpact >= 500 ? 'Top 15% Contributor' : 'Active Contributor'}
                  </Badge>
                  {currentStreak > 0 && (
                    <Badge variant="outline" className="text-sm py-1 px-3 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {currentStreak} Day Streak
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ==================== AI INSIGHTS TAB ==================== */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Optimal Departure Times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Optimal Departure Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Morning Commute</p>
                    <Badge variant="outline" className="bg-green-100">AI Recommendation</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Your average</p>
                      <p className="text-lg font-semibold">07:30</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended</p>
                      <p className="text-lg font-semibold text-green-600">06:45</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">✨ Save up to 15 minutes by leaving earlier</p>
                </div>
                
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">💡 Travel Tip</p>
                  <p className="text-xs text-muted-foreground">
                    Based on your preferred transport mode {profile?.preferred_transport || 'taxi'}, 
                    leaving before peak hours can significantly reduce your commute time.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Route Efficiency Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Route Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">From {profile?.home || 'Your Home'} to CBD</p>
                      <p className="text-xs text-muted-foreground">Based on historical data</p>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      {profile?.preferred_transport === 'taxi' ? 'Taxi: 35min' : 'Bus: 42min'}
                    </Badge>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm font-medium mb-2">🚀 Suggested Improvement</p>
                    <p className="text-xs text-muted-foreground">
                      Consider trying {profile?.preferred_transport === 'taxi' ? 'train' : 'taxi'} for your commute - 
                      it could save you up to 8 minutes per trip!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Points Summary */}
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <CardContent className="p-6">
                <div className="text-center">
                  <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold mb-1">{profile?.points || 0}</h3>
                  <p className="text-sm text-muted-foreground mb-3">Total Points Earned</p>
                  <div className="flex justify-center gap-4 text-sm">
                    <div>
                      <p className="font-semibold">
                        {(profile?.points || 0) >= 1000 ? '🏆 Level 5' : 
                         (profile?.points || 0) >= 500 ? '🏅 Level 4' :
                         (profile?.points || 0) >= 250 ? '⭐ Level 3' :
                         (profile?.points || 0) >= 100 ? '🌟 Level 2' : '🌱 Level 1'}
                      </p>
                      <p className="text-xs text-muted-foreground">{profile?.selected_title || 'Community Member'}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{currentStreak} days</p>
                      <p className="text-xs text-muted-foreground">Current Streak</p>
                    </div>
                    <div>
                      <p className="font-semibold">{achievementsEarned}</p>
                      <p className="text-xs text-muted-foreground">Achievements</p>
                    </div>
                  </div>
                  {currentStreak >= 7 && (
                    <Badge className="mt-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      🔥 Weekly Streak Bonus +50 pts
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Travel Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Travel Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Home Location</span>
                    <Badge variant="outline">{profile?.home || 'Not set'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Preferred Language</span>
                    <Badge variant="outline">{profile?.preferred_language || 'English'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Favorite Spots</span>
                    <Badge variant="outline">{profile?.favorites_count || 0} saved</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Titles Earned</span>
                    <Badge variant="outline">{profile?.titles?.length || 0} titles</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserReports;