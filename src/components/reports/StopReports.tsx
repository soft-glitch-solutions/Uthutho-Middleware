import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Flag, TrendingUp, Navigation, Calendar, DollarSign, BarChart3, Filter, Search } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  route_id: string | null;
  order_number: number | null;
  cost: number | null;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface Region {
  name: string;
  provinces: string[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

const SOUTH_AFRICAN_REGIONS: Region[] = [
  {
    name: 'Cape Town / Western Cape',
    provinces: ['Western Cape'],
    bounds: {
      north: -33.5,
      south: -34.5,
      east: 18.0,
      west: 18.8
    }
  },
  {
    name: 'Gauteng (Johannesburg/Pretoria)',
    provinces: ['Gauteng'],
    bounds: {
      north: -25.5,
      south: -26.5,
      east: 27.8,
      west: 28.5
    }
  },
  {
    name: 'Durban / KwaZulu-Natal',
    provinces: ['KwaZulu-Natal'],
    bounds: {
      north: -29.5,
      south: -30.5,
      east: 30.8,
      west: 31.2
    }
  },
  {
    name: 'Garden Route',
    provinces: ['Western Cape', 'Eastern Cape'],
    bounds: {
      north: -33.8,
      south: -34.2,
      east: 22.0,
      west: 23.5
    }
  },
  {
    name: 'Eastern Cape',
    provinces: ['Eastern Cape'],
    bounds: {
      north: -32.0,
      south: -34.0,
      east: 25.0,
      west: 28.0
    }
  },
  {
    name: 'Free State',
    provinces: ['Free State'],
    bounds: {
      north: -27.0,
      south: -30.0,
      east: 25.0,
      west: 28.0
    }
  },
  {
    name: 'Mpumalanga',
    provinces: ['Mpumalanga'],
    bounds: {
      north: -25.0,
      south: -27.0,
      east: 30.0,
      west: 32.0
    }
  },
  {
    name: 'North West',
    provinces: ['North West'],
    bounds: {
      north: -25.0,
      south: -27.5,
      east: 25.0,
      west: 28.0
    }
  },
  {
    name: 'Limpopo',
    provinces: ['Limpopo'],
    bounds: {
      north: -22.0,
      south: -24.5,
      east: 29.0,
      west: 31.5
    }
  },
  {
    name: 'Northern Cape',
    provinces: ['Northern Cape'],
    bounds: {
      north: -28.0,
      south: -30.5,
      east: 20.0,
      west: 24.0
    }
  }
];

const StopReports = () => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [flaggedStops, setFlaggedStops] = useState<Set<string>>(new Set());
  const [flagNotes, setFlagNotes] = useState<Map<string, string>>(new Map());
  const [showFlagModal, setShowFlagModal] = useState<string | null>(null);
  const [currentFlagNote, setCurrentFlagNote] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const { toast } = useToast();

  useEffect(() => {
    fetchStops();
    loadFlagsFromStorage();
  }, []);

  const fetchStops = async () => {
    try {
      const { data, error } = await supabase
        .from('stops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStops(data || []);
    } catch (error) {
      console.error('Error fetching stops:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stops.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFlagsFromStorage = () => {
    const savedFlags = localStorage.getItem('stopFlags');
    const savedNotes = localStorage.getItem('stopFlagNotes');
    
    if (savedFlags) {
      setFlaggedStops(new Set(JSON.parse(savedFlags)));
    }
    if (savedNotes) {
      setFlagNotes(new Map(JSON.parse(savedNotes)));
    }
  };

  const saveFlagsToStorage = (flags: Set<string>, notes: Map<string, string>) => {
    localStorage.setItem('stopFlags', JSON.stringify(Array.from(flags)));
    localStorage.setItem('stopFlagNotes', JSON.stringify(Array.from(notes.entries())));
  };

  const getStopRegion = (stop: Stop): string => {
    for (const region of SOUTH_AFRICAN_REGIONS) {
      if (stop.latitude <= region.bounds.north &&
          stop.latitude >= region.bounds.south &&
          stop.longitude >= region.bounds.west &&
          stop.longitude <= region.bounds.east) {
        return region.name;
      }
    }
    return 'Other Regions';
  };

  const toggleFlag = (stopId: string) => {
    const newFlags = new Set(flaggedStops);
    const newNotes = new Map(flagNotes);
    
    if (newFlags.has(stopId)) {
      newFlags.delete(stopId);
      newNotes.delete(stopId);
      toast({
        title: "Flag Removed",
        description: "Stop has been unmarked.",
      });
    } else {
      if (showFlagModal === stopId) {
        newFlags.add(stopId);
        if (currentFlagNote) {
          newNotes.set(stopId, currentFlagNote);
        }
        setShowFlagModal(null);
        setCurrentFlagNote('');
        toast({
          title: "Stop Flagged",
          description: "Stop has been flagged for review.",
        });
      } else {
        setShowFlagModal(stopId);
        return;
      }
    }
    
    setFlaggedStops(newFlags);
    setFlagNotes(newNotes);
    saveFlagsToStorage(newFlags, newNotes);
  };

  const getStopsByRegion = () => {
    const regionMap = new Map<string, Stop[]>();
    
    stops.forEach(stop => {
      const region = getStopRegion(stop);
      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(stop);
    });
    
    return Array.from(regionMap.entries())
      .map(([region, stops]) => ({ region, stops, count: stops.length }))
      .sort((a, b) => b.count - a.count);
  };

  const getFlaggedStopsByRegion = () => {
    const regionMap = new Map<string, Stop[]>();
    
    stops.forEach(stop => {
      if (flaggedStops.has(stop.id)) {
        const region = getStopRegion(stop);
        if (!regionMap.has(region)) {
          regionMap.set(region, []);
        }
        regionMap.get(region)!.push(stop);
      }
    });
    
    return Array.from(regionMap.entries())
      .map(([region, stops]) => ({ region, stops, count: stops.length }));
  };

  const getCostAnalysis = () => {
    const regionCosts = new Map<string, { total: number; count: number; min: number; max: number }>();
    
    stops.forEach(stop => {
      if (stop.cost) {
        const region = getStopRegion(stop);
        if (!regionCosts.has(region)) {
          regionCosts.set(region, { total: 0, count: 0, min: Infinity, max: -Infinity });
        }
        const data = regionCosts.get(region)!;
        data.total += stop.cost;
        data.count++;
        data.min = Math.min(data.min, stop.cost);
        data.max = Math.max(data.max, stop.cost);
      }
    });
    
    return Array.from(regionCosts.entries())
      .map(([region, data]) => ({
        region,
        averageCost: data.total / data.count,
        totalStops: data.count,
        minCost: data.min,
        maxCost: data.max
      }))
      .sort((a, b) => b.averageCost - a.averageCost);
  };

  const filterStopsByRegion = (stops: Stop[]) => {
    if (selectedRegion === 'all') return stops;
    return stops.filter(stop => getStopRegion(stop) === selectedRegion);
  };

  const filterStopsBySearch = (stops: Stop[]) => {
    if (!searchTerm) return stops;
    return stops.filter(stop =>
      stop.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredStops = () => {
    let filtered = filterStopsByRegion(stops);
    filtered = filterStopsBySearch(filtered);
    return filtered;
  };

  const regionStats = getStopsByRegion();
  const flaggedStats = getFlaggedStopsByRegion();
  const costAnalysis = getCostAnalysis();
  const filteredStops = getFilteredStops();
  const totalFlagged = flaggedStops.size;
  const totalCostStops = stops.filter(s => s.cost).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="h-12 bg-muted rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Flag className="w-8 h-8 text-transport-stop" />
            Stop Reports & Analytics
          </h1>
          <p className="text-muted-foreground">Analyze stops by region, flag locations, and track metrics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="transport-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stops</p>
                <p className="text-2xl font-bold">{stops.length}</p>
              </div>
              <Navigation className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transport-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged Stops</p>
                <p className="text-2xl font-bold">{totalFlagged}</p>
              </div>
              <Flag className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transport-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regions Covered</p>
                <p className="text-2xl font-bold">{regionStats.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transport-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stops with Cost</p>
                <p className="text-2xl font-bold">{totalCostStops}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'analytics')} className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Stop List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Region Distribution Chart */}
          <Card className="transport-card">
            <CardHeader>
              <CardTitle>Stop Distribution by Region</CardTitle>
              <CardDescription>Number of stops across different South African regions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Number of Stops" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost Analysis Chart */}
          {costAnalysis.length > 0 && (
            <Card className="transport-card">
              <CardHeader>
                <CardTitle>Average Cost by Region</CardTitle>
                <CardDescription>Comparison of average transport costs across regions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="region" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageCost" fill="#10b981" name="Average Cost (R)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flagged Stops Overview */}
          {flaggedStats.length > 0 && (
            <Card className="transport-card">
              <CardHeader>
                <CardTitle>Flagged Stops Overview</CardTitle>
                <CardDescription>Stops marked for review by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {flaggedStats.map(stat => (
                    <div key={stat.region} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div>
                        <p className="font-medium">{stat.region}</p>
                        <p className="text-sm text-muted-foreground">{stat.count} flagged stops</p>
                      </div>
                      <Badge variant="destructive">{stat.count} Flags</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Filter by region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {SOUTH_AFRICAN_REGIONS.map(region => (
                      <SelectItem key={region.name} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other Regions">Other Regions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transport-input"
                />
              </div>
            </div>
          </div>

          {/* Stops List */}
          <div className="grid gap-4">
            {filteredStops.length === 0 ? (
              <Card className="transport-card">
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">
                    {searchTerm || selectedRegion !== 'all' 
                      ? 'No stops found matching your filters.' 
                      : 'No stops available.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredStops.map((stop) => (
                <Card key={stop.id} className={`transport-card hover:shadow-xl transition-all duration-200 ${flaggedStops.has(stop.id) ? 'border-red-500 border-2' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl text-foreground">{stop.name}</CardTitle>
                          {flaggedStops.has(stop.id) && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                          {flagNotes.get(stop.id) && (
                            <Badge variant="outline">Note Added</Badge>
                          )}
                        </div>
                        <CardDescription className="text-muted-foreground">
                          Region: {getStopRegion(stop)}
                        </CardDescription>
                      </div>
                      <Button
                        variant={flaggedStops.has(stop.id) ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleFlag(stop.id)}
                        className={flaggedStops.has(stop.id) ? "" : "transport-button-secondary"}
                      >
                        <Flag className="w-4 h-4 mr-1" />
                        {flaggedStops.has(stop.id) ? "Flagged" : "Flag Stop"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Coordinates</p>
                        <p className="font-medium">{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-medium">{stop.cost ? `R${stop.cost}` : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Order</p>
                        <p className="font-medium">{stop.order_number || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(stop.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {flagNotes.get(stop.id) && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Flag Note:</p>
                        <p className="text-sm text-muted-foreground">{flagNotes.get(stop.id)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Flag Stop</CardTitle>
              <CardDescription>Add a note explaining why this stop is being flagged</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="flagNote">Note (Optional)</Label>
                <Input
                  id="flagNote"
                  value={currentFlagNote}
                  onChange={(e) => setCurrentFlagNote(e.target.value)}
                  placeholder="e.g., Safety concern, incorrect location, etc."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => toggleFlag(showFlagModal)} className="flex-1">
                  Confirm Flag
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFlagModal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StopReports;