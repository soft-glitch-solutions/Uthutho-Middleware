import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { RefreshCw, Filter, X, Download, Calendar, Users, MapPin, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface RouteReport {
  route_id: string;
  origin: string;
  destination: string;
  total_passengers: number;
  passengers_by_class?: {
    economy: number;
    business: number;
    first: number;
  };
  total_revenue?: number;
  departure_count?: number;
}

interface PassengerRouteReport {
  date: string;
  routes: RouteReport[];
  summary: {
    total_passengers: number;
    total_routes: number;
    busiest_route: string;
    average_passengers_per_route: number;
  };
}

const PassengersPerRouteReport = () => {
  const [reportData, setReportData] = useState<PassengerRouteReport | null>(null);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('passengers_desc');
  const [minPassengers, setMinPassengers] = useState<string>('');

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  useEffect(() => {
    applyFilters();
  }, [reportData, routeFilter, sortBy, minPassengers]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      // This query assumes your database structure. Adjust table/column names as needed
      const { data, error } = await supabase
        .from('bookings') // or 'trips' or whatever your bookings table is
        .select(`
          route_id,
          routes:route_id (
            origin,
            destination
          ),
          passenger_count,
          booking_class,
          total_amount,
          departure_date
        `)
        .gte('departure_date', dateRange.from)
        .lte('departure_date', dateRange.to);

      if (error) throw error;

      // Process data to get passengers per route
      const routeMap = new Map<string, RouteReport>();

      data?.forEach((booking: any) => {
        const routeId = booking.route_id;
        const route = booking.routes;
        
        if (!routeMap.has(routeId)) {
          routeMap.set(routeId, {
            route_id: routeId,
            origin: route?.origin || 'Unknown',
            destination: route?.destination || 'Unknown',
            total_passengers: 0,
            passengers_by_class: {
              economy: 0,
              business: 0,
              first: 0
            },
            total_revenue: 0,
            departure_count: 0
          });
        }

        const routeData = routeMap.get(routeId)!;
        routeData.total_passengers += booking.passenger_count || 1;
        routeData.total_revenue = (routeData.total_revenue || 0) + (booking.total_amount || 0);
        routeData.departure_count = (routeData.departure_count || 0) + 1;

        // Track by class
        if (routeData.passengers_by_class && booking.booking_class) {
          const classKey = booking.booking_class.toLowerCase() as keyof typeof routeData.passengers_by_class;
          if (routeData.passengers_by_class[classKey] !== undefined) {
            routeData.passengers_by_class[classKey] += (booking.passenger_count || 1);
          }
        }
      });

      const routes = Array.from(routeMap.values());
      
      // Calculate summary statistics
      const busiestRoute = routes.reduce((max, route) => 
        route.total_passengers > max.total_passengers ? route : max, routes[0] || { total_passengers: 0, origin: '', destination: '' }
      );

      const summary = {
        total_passengers: routes.reduce((sum, route) => sum + route.total_passengers, 0),
        total_routes: routes.length,
        busiest_route: busiestRoute ? `${busiestRoute.origin} → ${busiestRoute.destination}` : 'N/A',
        average_passengers_per_route: routes.length > 0 ? 
          Math.round(routes.reduce((sum, route) => sum + route.total_passengers, 0) / routes.length) : 0
      };

      setReportData({
        date: `${dateRange.from} to ${dateRange.to}`,
        routes,
        summary
      });
      
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load passenger report');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!reportData) return;
    
    let filtered = [...reportData.routes];

    // Apply route filter
    if (routeFilter !== 'all') {
      filtered = filtered.filter(route => 
        `${route.origin}-${route.destination}`.toLowerCase().includes(routeFilter.toLowerCase())
      );
    }

    // Apply minimum passengers filter
    if (minPassengers) {
      const min = parseInt(minPassengers);
      if (!isNaN(min)) {
        filtered = filtered.filter(route => route.total_passengers >= min);
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'passengers_desc':
        filtered.sort((a, b) => b.total_passengers - a.total_passengers);
        break;
      case 'passengers_asc':
        filtered.sort((a, b) => a.total_passengers - b.total_passengers);
        break;
      case 'route_asc':
        filtered.sort((a, b) => `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`));
        break;
      case 'revenue_desc':
        filtered.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
        break;
    }

    setFilteredRoutes(filtered);
  };

  const handleResetFilters = () => {
    setRouteFilter('all');
    setMinPassengers('');
    setSortBy('passengers_desc');
  };

  const handleExportCSV = () => {
    if (!filteredRoutes.length) return;

    const exportData = filteredRoutes.map(route => ({
      'Origin': route.origin,
      'Destination': route.destination,
      'Total Passengers': route.total_passengers,
      'Economy': route.passengers_by_class?.economy || 0,
      'Business': route.passengers_by_class?.business || 0,
      'First Class': route.passengers_by_class?.first || 0,
      'Total Revenue': route.total_revenue ? `$${route.total_revenue.toFixed(2)}` : 'N/A',
      'Number of Departures': route.departure_count || 0,
      'Avg Passengers per Trip': route.departure_count ? Math.round(route.total_passengers / route.departure_count) : 0
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => JSON.stringify(row[h as keyof typeof row] || '')).join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passengers-per-route-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const hasActiveFilters = routeFilter !== 'all' || minPassengers || sortBy !== 'passengers_desc';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Passengers Per Route Report</h2>
          {reportData && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{reportData.summary.total_passengers}</span>
                <span className="text-muted-foreground">total passengers</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{reportData.summary.total_routes}</span>
                <span className="text-muted-foreground">routes</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{reportData.summary.average_passengers_per_route}</span>
                <span className="text-muted-foreground">avg/route</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                {dateRange.from} to {dateRange.to}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" align="end">
              <div className="space-y-3 p-2">
                <div>
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <Button size="sm" onClick={() => fetchReport()}>Apply Date Range</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filters Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                      <X className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Route</Label>
                  <Input
                    placeholder="Filter by origin or destination..."
                    value={routeFilter === 'all' ? '' : routeFilter}
                    onChange={(e) => setRouteFilter(e.target.value || 'all')}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Minimum Passengers</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={minPassengers}
                    onChange={(e) => setMinPassengers(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passengers_desc">Most Passengers First</SelectItem>
                      <SelectItem value="passengers_asc">Least Passengers First</SelectItem>
                      <SelectItem value="route_asc">Route Name (A-Z)</SelectItem>
                      <SelectItem value="revenue_desc">Highest Revenue First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={!filteredRoutes.length}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          
          <Button onClick={fetchReport} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Passengers</p>
                  <p className="text-2xl font-bold">{reportData.summary.total_passengers}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Routes</p>
                  <p className="text-2xl font-bold">{reportData.summary.total_routes}</p>
                </div>
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Busiest Route</p>
                  <p className="text-lg font-semibold truncate">{reportData.summary.busiest_route}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Passengers/Route</p>
                  <p className="text-2xl font-bold">{reportData.summary.average_passengers_per_route}</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {routeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Route: {routeFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setRouteFilter('all')} />
            </Badge>
          )}
          {minPassengers && (
            <Badge variant="secondary" className="gap-1">
              Min Passengers: {minPassengers}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setMinPassengers('')} />
            </Badge>
          )}
          {sortBy !== 'passengers_desc' && (
            <Badge variant="secondary" className="gap-1">
              Sort: {sortBy.replace('_', ' ')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSortBy('passengers_desc')} />
            </Badge>
          )}
        </div>
      )}

      {/* Report Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Total Passengers</TableHead>
                  <TableHead>By Class</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Departures</TableHead>
                  <TableHead>Avg Passengers/Trip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : !filteredRoutes.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No passenger data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoutes.map((route) => (
                    <TableRow key={route.route_id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{route.origin}</span>
                          <span>→</span>
                          <span>{route.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-blue-500">
                          {route.total_passengers}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs">
                          {route.passengers_by_class && (
                            <>
                              <Badge variant="outline">E: {route.passengers_by_class.economy}</Badge>
                              <Badge variant="outline">B: {route.passengers_by_class.business}</Badge>
                              <Badge variant="outline">F: {route.passengers_by_class.first}</Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {route.total_revenue ? `$${route.total_revenue.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {route.departure_count || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {route.departure_count ? Math.round(route.total_passengers / route.departure_count) : 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PassengersPerRouteReport;