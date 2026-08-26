// src/components/StopsReport.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, MapPin, BarChart3, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

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

interface RegionCount {
  region: string;
  count: number;
  stops: Stop[];
}

const StopsReport = () => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [regions, setRegions] = useState<string[]>([]);
  const [regionCounts, setRegionCounts] = useState<RegionCount[]>([]);
  const { toast } = useToast();

  // Fetch stops
  const fetchStops = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setStops(data || []);
      
      // Extract regions from stop names (assuming format: "City - Stop Name" or similar)
      // You can adjust this logic based on your actual data structure
      const regionSet = new Set<string>();
      (data || []).forEach(stop => {
        // Example: Extract region from stop name (e.g., "Cape Town - Main Stop" -> "Cape Town")
        const parts = stop.name.split(' - ');
        const region = parts.length > 1 ? parts[0] : 'Unassigned';
        regionSet.add(region);
      });
      
      const regionList = Array.from(regionSet).sort();
      setRegions(regionList);
      
      // Calculate region counts
      const counts = calculateRegionCounts(data || []);
      setRegionCounts(counts);
      
    } catch (error) {
      console.error('Error fetching stops:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stops data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Calculate region counts
  const calculateRegionCounts = (stopsData: Stop[]): RegionCount[] => {
    const regionMap = new Map<string, Stop[]>();
    
    stopsData.forEach(stop => {
      const parts = stop.name.split(' - ');
      const region = parts.length > 1 ? parts[0] : 'Unassigned';
      
      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(stop);
    });
    
    return Array.from(regionMap.entries()).map(([region, stops]) => ({
      region,
      count: stops.length,
      stops
    })).sort((a, b) => b.count - a.count);
  };

  // Get filtered stops based on region selection
  const filteredStops = useMemo(() => {
    if (selectedRegion === 'all') {
      return stops;
    }
    const regionStops = regionCounts.find(rc => rc.region === selectedRegion);
    return regionStops?.stops || [];
  }, [stops, selectedRegion, regionCounts]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    try {
      const exportData = filteredStops.map(stop => ({
        'Stop Name': stop.name,
        'Latitude': stop.latitude,
        'Longitude': stop.longitude,
        'Route ID': stop.route_id || 'Not assigned',
        'Order Number': stop.order_number || 'Not set',
        'Cost': stop.cost ? `R${stop.cost}` : 'Not set',
        'Created Date': new Date(stop.created_at).toLocaleDateString(),
        'Updated Date': new Date(stop.updated_at).toLocaleDateString(),
      }));

      // Add summary sheet
      const summaryData = regionCounts.map(rc => ({
        'Region': rc.region,
        'Number of Stops': rc.count,
        'Percentage': `${((rc.count / stops.length) * 100).toFixed(1)}%`
      }));

      const wb = XLSX.utils.book_new();
      
      // Main data sheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Stops Data');
      
      // Summary sheet
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      // Auto-size columns (approximate)
      const colWidths = [
        { wch: 30 }, // Stop Name
        { wch: 15 }, // Latitude
        { wch: 15 }, // Longitude
        { wch: 20 }, // Route ID
        { wch: 15 }, // Order Number
        { wch: 15 }, // Cost
        { wch: 15 }, // Created Date
        { wch: 15 }, // Updated Date
      ];
      ws['!cols'] = colWidths;
      
      const filename = `stops_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Success",
        description: `Report exported as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export report.",
        variant: "destructive",
      });
    }
  }, [filteredStops, regionCounts, stops.length, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-transport-stop" />
            Stops Report
          </h2>
          <p className="text-muted-foreground">Analyze stop distribution and generate reports</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={fetchStops}
            className="transport-button-secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={exportToExcel}
            className="transport-button-primary"
            size="sm"
            disabled={filteredStops.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stops</CardDescription>
            <CardTitle className="text-3xl">{stops.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {regionCounts.length} regions detected
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Regions with Most Stops</CardDescription>
            <CardTitle className="text-xl truncate">
              {regionCounts[0]?.region || 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {regionCounts[0]?.count || 0} stops
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Stops per Region</CardDescription>
            <CardTitle className="text-3xl">
              {regionCounts.length > 0 
                ? Math.round(stops.length / regionCounts.length) 
                : 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Across {regionCounts.length} regions
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Stops</CardDescription>
            <CardTitle className="text-3xl">{filteredStops.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {selectedRegion === 'all' ? 'All regions' : selectedRegion}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Map Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>
                    {region} ({regionCounts.find(rc => rc.region === region)?.count || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 inline mr-1" />
            Showing {filteredStops.length} of {stops.length} stops
          </div>
        </div>

        {/* Map */}
        <Card>
          <CardContent className="p-2">
            <div className="h-[500px] w-full rounded-lg overflow-hidden">
              {filteredStops.length > 0 ? (
                <iframe
                  title="Stops map"
                  className="h-full w-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${filteredStops[0].longitude - 0.1}%2C${filteredStops[0].latitude - 0.1}%2C${filteredStops[0].longitude + 0.1}%2C${filteredStops[0].latitude + 0.1}&layer=mapnik&marker=${filteredStops[0].latitude}%2C${filteredStops[0].longitude}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No stops available for this region
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Region Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Region Distribution</CardTitle>
          <CardDescription>
            Breakdown of stops by region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Number of Stops</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionCounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No region data available
                  </TableCell>
                </TableRow>
              ) : (
                regionCounts.map((region) => (
                  <TableRow key={region.region}>
                    <TableCell className="font-medium">{region.region}</TableCell>
                    <TableCell className="text-right">{region.count}</TableCell>
                    <TableCell className="text-right">
                      {((region.count / stops.length) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRegion(region.region)}
                        className="transport-button-secondary"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StopsReport;