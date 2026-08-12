import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Download, 
  Filter, 
  Star, 
  Clock, 
  MapPin, 
  Globe,
  Award,
  TrendingUp,
  Calendar,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  updated_at: string | null;
  avatar_url: string | null;
  preferred_transport: string | null;
  points: number | null;
  titles: string[] | null;
  selected_title: string | null;
  favorites: any;
  home: string | null;
  preferred_language: string | null;
  fire_count: number | null;
  trips: number;
  total_ride_time: number;
  favorites_count: number;
  total_trips: number | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface EnrichedUser extends UserProfile {
  role?: string;
  full_name: string;
  avg_ride_time_per_trip: number;
  points_per_trip: number;
}

const UserReports = () => {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [transportFilter, setTransportFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('points');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersData();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, transportFilter, sortBy]);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('points', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user roles
      const rolesMap = new Map();
      rolesData?.forEach(role => {
        rolesMap.set(role.user_id, role.role);
      });

      // Get user emails
      const usersWithDetails = [];
      for (const profile of profilesData || []) {
        try {
          const { data: emailData } = await supabase.rpc('get_user_email', { 
            user_id: profile.id 
          });
          
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          const avgRideTime = profile.total_trips > 0 
            ? profile.total_ride_time / profile.total_trips 
            : 0;
          const pointsPerTrip = profile.total_trips > 0 
            ? (profile.points || 0) / profile.total_trips 
            : 0;
          
          usersWithDetails.push({
            ...profile,
            email: emailData || 'N/A',
            role: rolesMap.get(profile.id) || 'user',
            full_name: fullName || 'Unnamed User',
            avg_ride_time_per_trip: avgRideTime,
            points_per_trip: pointsPerTrip
          });
        } catch (error) {
          console.warn(`Could not get email for user ${profile.id}:`, error);
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          usersWithDetails.push({
            ...profile,
            email: 'N/A',
            role: rolesMap.get(profile.id) || 'user',
            full_name: fullName || 'Unnamed User',
            avg_ride_time_per_trip: 0,
            points_per_trip: 0
          });
        }
      }

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users data:', error);
      toast({
        title: "Error",
        description: "Failed to load users data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.home?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply transport filter
    if (transportFilter !== 'all') {
      filtered = filtered.filter(user => user.preferred_transport === transportFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'trips':
          return (b.total_trips || 0) - (a.total_trips || 0);
        case 'rideTime':
          return (b.total_ride_time || 0) - (a.total_ride_time || 0);
        case 'fireCount':
          return (b.fire_count || 0) - (a.fire_count || 0);
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel
      const excelData = filteredUsers.map(user => ({
        'Full Name': user.full_name,
        'Email': user.email,
        'Role': user.role || 'user',
        'Points': user.points || 0,
        'Total Trips': user.total_trips || 0,
        'Total Ride Time (mins)': user.total_ride_time || 0,
        'Avg Ride Time per Trip': Math.round(user.avg_ride_time_per_trip),
        'Points per Trip': user.points_per_trip.toFixed(2),
        'Fire Count': user.fire_count || 0,
        'Favorites Count': user.favorites_count || 0,
        'Preferred Transport': user.preferred_transport || 'Not specified',
        'Selected Title': user.selected_title || 'Newbie Explorer',
        'Home Location': user.home || 'Not specified',
        'Preferred Language': user.preferred_language || 'Not specified',
        'Titles Unlocked': user.titles?.length || 0,
        'Last Updated': user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Adjust column widths
      const colWidths = [
        { wch: 25 }, // Full Name
        { wch: 30 }, // Email
        { wch: 12 }, // Role
        { wch: 10 }, // Points
        { wch: 12 }, // Total Trips
        { wch: 20 }, // Total Ride Time
        { wch: 20 }, // Avg Ride Time
        { wch: 15 }, // Points per Trip
        { wch: 12 }, // Fire Count
        { wch: 15 }, // Favorites Count
        { wch: 18 }, // Preferred Transport
        { wch: 25 }, // Selected Title
        { wch: 20 }, // Home Location
        { wch: 18 }, // Preferred Language
        { wch: 18 }, // Titles Unlocked
        { wch: 15 }, // Last Updated
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users Data');

      // Add summary sheet
      const summaryData = [
        { Metric: 'Total Users', Value: filteredUsers.length },
        { Metric: 'Total Points (All Users)', Value: filteredUsers.reduce((sum, u) => sum + (u.points || 0), 0) },
        { Metric: 'Total Trips', Value: filteredUsers.reduce((sum, u) => sum + (u.total_trips || 0), 0) },
        { Metric: 'Average Points per User', Value: (filteredUsers.reduce((sum, u) => sum + (u.points || 0), 0) / filteredUsers.length).toFixed(2) },
        { Metric: 'Average Trips per User', Value: (filteredUsers.reduce((sum, u) => sum + (u.total_trips || 0), 0) / filteredUsers.length).toFixed(2) },
        { Metric: 'Users with Home Location', Value: filteredUsers.filter(u => u.home).length },
        { Metric: 'Active Users (with trips)', Value: filteredUsers.filter(u => u.total_trips > 0).length },
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate Excel file
      const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Successful",
        description: `${filteredUsers.length} users exported to Excel.`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTransportIcon = (transport: string | null) => {
    switch (transport) {
      case 'bus':
        return '🚌';
      case 'train':
        return '🚆';
      case 'tram':
        return '🚊';
      case 'metro':
        return '🚇';
      default:
        return '🚍';
    }
  };

  const uniqueRoles = [...new Set(users.map(u => u.role))];
  const uniqueTransports = [...new Set(users.map(u => u.preferred_transport).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"></div>
      </div>
    );
  }

  const stats = {
    totalUsers: filteredUsers.length,
    totalPoints: filteredUsers.reduce((sum, u) => sum + (u.points || 0), 0),
    totalTrips: filteredUsers.reduce((sum, u) => sum + (u.total_trips || 0), 0),
    avgPointsPerUser: (filteredUsers.reduce((sum, u) => sum + (u.points || 0), 0) / filteredUsers.length).toFixed(1),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-transport-primary" />
            Users Cloud Data
          </h1>
          <p className="text-muted-foreground">Comprehensive user analytics and management</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
              </div>
              <Award className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{stats.totalTrips.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Points/User</p>
                <p className="text-2xl font-bold">{stats.avgPointsPerUser}</p>
              </div>
              <Star className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Sorting
          </CardTitle>
          <CardDescription>Filter and sort user data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or home..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Preferred Transport</label>
              <Select value={transportFilter} onValueChange={setTransportFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transports</SelectItem>
                  {uniqueTransports.map(transport => (
                    <SelectItem key={transport} value={transport!}>
                      {getTransportIcon(transport)} {transport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points (Highest)</SelectItem>
                  <SelectItem value="trips">Total Trips (Most)</SelectItem>
                  <SelectItem value="rideTime">Total Ride Time (Most)</SelectItem>
                  <SelectItem value="fireCount">Fire Count (Most)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Details
          </CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} total users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Ride Time</TableHead>
                  <TableHead>🔥 Fire Count</TableHead>
                  <TableHead>⭐ Favorites</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Languages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeColor(user.role || 'user')}>
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {user.points || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {user.total_trips || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {user.total_ride_time || 0} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{user.fire_count || 0}</span>
                    </TableCell>
                    <TableCell>{user.favorites_count || 0}</TableCell>
                    <TableCell>
                      {user.preferred_transport ? (
                        <Badge variant="outline">
                          {getTransportIcon(user.preferred_transport)} {user.preferred_transport}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {user.selected_title || 'Newbie Explorer'}
                    </TableCell>
                    <TableCell>
                      {user.home ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="text-sm">{user.home}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {user.preferred_language ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {user.preferred_language}
                        </div>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserReports;