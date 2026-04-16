
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Route, Plus, Edit, Trash2, Search, GitCompare, Settings, X, Map, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RouteForm from './RouteForm';
import TransportMap from './TransportMap';

interface RouteData {
  id: string;
  name: string;
  start_point: string;
  end_point: string;
  transport_type: string;
  cost: number;
  hub_id: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

const RoutesManagement = () => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transportTypeFilter, setTransportTypeFilter] = useState('all');
  const [hubFilter, setHubFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showTransportTypes, setShowTransportTypes] = useState(false);
  const [transportTypes, setTransportTypes] = useState<string[]>([
    'Taxi', 'Bus', 'Train', 'Uber', 'Bolt', 'Carpool'
  ]);
  const [newTransportType, setNewTransportType] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes((data as any) || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch routes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;

      setRoutes(routes.filter(route => route.id !== routeId));
      toast({
        title: "Success",
        description: "Route deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting route:', error);
      toast({
        title: "Error",
        description: "Failed to delete route.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (route: RouteData) => {
    setSelectedRoute(route);
    setIsEditOpen(true);
  };

  const handleFormSuccess = () => {
    fetchRoutes();
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedRoute(null);
  };

  const filteredRoutes = routes
    .filter(route => {
      const matchesSearch = route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.start_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.end_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.transport_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTransportType = transportTypeFilter === 'all' || route.transport_type === transportTypeFilter;
      const matchesHub = hubFilter === 'all' || 
        (hubFilter === 'with_hub' && route.hub_id) || 
        (hubFilter === 'no_hub' && !route.hub_id);
      
      return matchesSearch && matchesTransportType && matchesHub;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cost':
          return a.cost - b.cost;
        case 'transport_type':
          return a.transport_type.localeCompare(b.transport_type);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Detect potential duplicates
  const getDuplicateInfo = (route: RouteData) => {
    const duplicates = routes.filter(r => 
      r.id !== route.id &&
      r.start_point === route.start_point &&
      r.end_point === route.end_point &&
      r.transport_type === route.transport_type
    );
    return duplicates.length > 0 ? duplicates.length : null;
  };

  const uniqueTransportTypes = Array.from(new Set([...transportTypes, ...routes.map(r => r.transport_type).filter(Boolean)]));

  const handleAddTransportType = () => {
    if (!newTransportType.trim()) {
      toast({
        title: "Error",
        description: "Please enter a transport type name.",
        variant: "destructive",
      });
      return;
    }
    if (transportTypes.includes(newTransportType.trim())) {
      toast({
        title: "Error",
        description: "This transport type already exists.",
        variant: "destructive",
      });
      return;
    }
    setTransportTypes([...transportTypes, newTransportType.trim()]);
    setNewTransportType('');
    toast({
      title: "Success",
      description: `Transport type "${newTransportType.trim()}" added.`,
    });
  };

  const handleDeleteTransportType = (type: string) => {
    const routesUsingType = routes.filter(r => r.transport_type === type);
    if (routesUsingType.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `${routesUsingType.length} route(s) are using this transport type.`,
        variant: "destructive",
      });
      return;
    }
    setTransportTypes(transportTypes.filter(t => t !== type));
    toast({
      title: "Success",
      description: `Transport type "${type}" deleted.`,
    });
  };

  // String similarity calculation (Levenshtein distance based)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = (s1: string, s2: string): number => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };
    
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  // Find similar routes
  const findSimilarRoutes = () => {
    const similarGroups: RouteData[][] = [];
    const processed = new Set<string>();

    routes.forEach((route) => {
      if (processed.has(route.id)) return;

      const similar = routes.filter(r => {
        if (r.id === route.id || processed.has(r.id)) return false;
        
        const nameSimilarity = calculateSimilarity(route.name, r.name);
        const sameStartEnd = route.start_point === r.start_point && route.end_point === r.end_point;
        
        return nameSimilarity > 0.7 || sameStartEnd;
      });

      if (similar.length > 0) {
        const group = [route, ...similar];
        similarGroups.push(group);
        group.forEach(r => processed.add(r.id));
      }
    });

    return similarGroups;
  };

  const similarRouteGroups = findSimilarRoutes();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="h-12 bg-muted rounded-lg"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"></div>
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
            <Route className="w-8 h-8 text-transport-route" />
            Routes Management
          </h1>
          <p className="text-muted-foreground">Manage transport routes and connections</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowTransportTypes(!showTransportTypes)}
            className={showTransportTypes ? "bg-primary/10" : ""}
          >
            <Settings className="w-4 h-4 mr-2" />
            Transport Types
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowComparison(!showComparison)}
            className={showComparison ? "bg-primary/10" : ""}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare Tool {similarRouteGroups.length > 0 && `(${similarRouteGroups.length})`}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="transport-button-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <RouteForm 
              onSuccess={handleFormSuccess}
              onCancel={() => setIsCreateOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList>
          <TabsTrigger value="map" className="flex items-center gap-1.5">
            <Map className="w-4 h-4" />
            Map Explorer
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <List className="w-4 h-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <TransportMap />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search routes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 transport-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Transport Type</Label>
                    <Select value={transportTypeFilter} onValueChange={setTransportTypeFilter}>
                      <SelectTrigger className="transport-input h-9">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {uniqueTransportTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Hub Association</Label>
                    <Select value={hubFilter} onValueChange={setHubFilter}>
                      <SelectTrigger className="transport-input h-9">
                        <SelectValue placeholder="All Routes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Routes</SelectItem>
                        <SelectItem value="with_hub">With Hub</SelectItem>
                        <SelectItem value="no_hub">No Hub</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="transport-input h-9">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Newest First</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="cost">Cost (Low to High)</SelectItem>
                        <SelectItem value="transport_type">Transport Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filteredRoutes.length}</span> of <span className="font-semibold text-foreground">{routes.length}</span> routes
                    {filteredRoutes.length !== routes.length && (
                      <span className="ml-2 text-warning">(filtered)</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

      {showTransportTypes && (
        <Card className="transport-card border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Transport Types Management
            </CardTitle>
            <CardDescription>
              Add or remove transport types used in routes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New transport type..."
                value={newTransportType}
                onChange={(e) => setNewTransportType(e.target.value)}
                className="transport-input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransportType()}
              />
              <Button onClick={handleAddTransportType} className="transport-button-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {transportTypes.map((type) => {
                const routeCount = routes.filter(r => r.transport_type === type).length;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg"
                  >
                    <span className="font-medium">{type}</span>
                    <span className="text-xs text-muted-foreground">({routeCount} routes)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransportType(type)}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      disabled={routeCount > 0}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {showComparison && similarRouteGroups.length > 0 && (
        <Card className="transport-card border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-warning" />
              Route Comparison Tool
            </CardTitle>
            <CardDescription>
              Found {similarRouteGroups.length} group{similarRouteGroups.length > 1 ? 's' : ''} of similar routes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {similarRouteGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Group {groupIndex + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((route) => (
                    <Card key={route.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{route.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {route.start_point} → {route.end_point}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium">{route.transport_type}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cost</p>
                            <p className="font-medium">R{route.cost}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Hub</p>
                            <p className="font-medium">{route.hub_id ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">{new Date(route.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {route.instructions && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground">Instructions</p>
                            <p className="text-xs mt-1">{route.instructions}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(route)}
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(route.id)}
                            className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showComparison && similarRouteGroups.length === 0 && (
        <Card className="transport-card border-success/50">
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No similar routes found! All routes appear unique.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {searchTerm ? 'No routes found matching your search.' : 'No routes available. Create your first route!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutes.map((route) => {
                  const duplicateCount = getDuplicateInfo(route);
                  return (
                    <TableRow key={route.id} className={duplicateCount ? 'bg-warning/5' : ''}>
                      <TableCell>
                        <div className="font-medium text-foreground">{route.name}</div>
                        {duplicateCount && (
                          <span className="text-[10px] bg-warning/20 text-warning px-2 py-0.5 rounded-full mt-1 inline-block">
                            {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {route.instructions && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{route.instructions}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="truncate max-w-[120px]">{route.start_point}</span>
                          <span className="mx-1">→</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span className="truncate max-w-[120px]">{route.end_point}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="transport-badge-route scale-90 origin-left inline-block">{route.transport_type}</span>
                      </TableCell>
                      <TableCell className="font-medium">R{route.cost}</TableCell>
                      <TableCell className="text-muted-foreground">{route.hub_id ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(route)}
                            className="transport-button-secondary h-8 w-8 p-0"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(route.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <RouteForm 
          route={selectedRoute}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsEditOpen(false)}
        />
      </Dialog>
    </div>
  );
};

export default RoutesManagement;
