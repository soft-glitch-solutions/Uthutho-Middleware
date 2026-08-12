import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Route, Map, Users, Building2, MapPin, Navigation, Globe, PhoneForwarded } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import OrganisationGeofenceMap from './OrganisationGeofenceMap';

interface OrganisationDetailsProps {
  organisation: any;
  onBack: () => void;
}

const OrganisationDetails: React.FC<OrganisationDetailsProps> = ({ organisation, onBack }) => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, [organisation.id]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('organisation_id', organisation.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching organisation routes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header section with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {organisation.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Badge variant="secondary" className="capitalize text-[10px]">
              {organisation.type.replace('_', ' ')}
            </Badge>
            {organisation.region_name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {organisation.region_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Map */}
        <div className="md:col-span-1 space-y-6">
          <Card className="transport-card">
            <CardHeader>
              <CardTitle className="text-lg">Organisation Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organisation.description && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">Description</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{organisation.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">Geofence Radius</p>
                  <p className="text-sm flex items-center gap-2 font-semibold">
                    <Globe className="w-4 h-4 text-primary" />
                    {organisation.radius_km} km
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">Active Routes</p>
                  <p className="text-sm flex items-center gap-2 font-semibold">
                    <Route className="w-4 h-4 text-transport-route" />
                    {routes.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transport-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" /> 
                Operational Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full rounded-lg overflow-hidden border">
                <OrganisationGeofenceMap
                  latitude={organisation.latitude || -26.2041}
                  longitude={organisation.longitude || 28.0473}
                  radiusKm={organisation.radius_km || 10}
                  onChange={() => {}}
                  editable={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Routes */}
        <div className="md:col-span-2">
          <Card className="transport-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5 text-transport-route" />
                Covered Routes
              </CardTitle>
              <CardDescription>
                Transport routes assigned to this organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">
                  Loading routes...
                </div>
              ) : routes.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route Name</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium whitespace-nowrap">{route.name}</TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <p className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {route.start_point}
                              </p>
                              <p className="flex items-center gap-1 text-muted-foreground border-l border-dashed ml-1 pl-2">
                                <Navigation className="w-3 h-3" />
                              </p>
                              <p className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                {route.end_point}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="transport-badge-route scale-90 origin-left inline-block">
                              {route.transport_type}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            R{route.cost}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center border-dashed border-2 rounded-xl bg-muted/20 text-muted-foreground flex flex-col items-center">
                  <Route className="w-12 h-12 mb-3 opacity-20" />
                  <p>No routes are currently assigned to this organisation.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrganisationDetails;
