import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Navigation, Plus, Edit, Trash2, Search, Map, List } from 'lucide-react';
import MapSelector from './MapSelector';
import StopMapExplorer from './StopMapExplorer';

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

const StopsManagement = () => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    cost: '',
    order_number: '',
  });
  const [showMapSelector, setShowMapSelector] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStops();
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('stops')
        .insert({
          name: formData.name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          order_number: formData.order_number ? parseInt(formData.order_number) : null,
          image_url: 'https://images.caxton.co.za/wp-content/uploads/sites/10/2023/03/IMG_9281_07602-e1680074626338-780x470.jpg',
        })
        .select()
        .single();

      if (error) throw error;

      setStops([data, ...stops]);
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Stop created successfully.",
      });
    } catch (error) {
      console.error('Error creating stop:', error);
      toast({
        title: "Error",
        description: "Failed to create stop.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStop) return;

    try {
      const { data, error } = await supabase
        .from('stops')
        .update({
          name: formData.name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          order_number: formData.order_number ? parseInt(formData.order_number) : null,
        })
        .eq('id', selectedStop.id)
        .select()
        .single();

      if (error) throw error;

      setStops(stops.map(stop => stop.id === selectedStop.id ? data : stop));
      setIsEditOpen(false);
      setSelectedStop(null);
      resetForm();
      toast({
        title: "Success",
        description: "Stop updated successfully.",
      });
    } catch (error) {
      console.error('Error updating stop:', error);
      toast({
        title: "Error",
        description: "Failed to update stop.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (stopId: string) => {
    if (!confirm('Are you sure you want to delete this stop?')) return;

    try {
      const { error } = await supabase
        .from('stops')
        .delete()
        .eq('id', stopId);

      if (error) throw error;

      setStops(stops.filter(stop => stop.id !== stopId));
      toast({
        title: "Success",
        description: "Stop deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting stop:', error);
      toast({
        title: "Error",
        description: "Failed to delete stop.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (stop: Stop) => {
    setSelectedStop(stop);
    setFormData({
      name: stop.name,
      latitude: stop.latitude.toString(),
      longitude: stop.longitude.toString(),
      cost: stop.cost?.toString() || '',
      order_number: stop.order_number?.toString() || '',
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      cost: '',
      order_number: '',
    });
    setShowMapSelector(false);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
    });
  };

  const filteredStops = stops.filter(stop =>
    stop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Navigation className="w-8 h-8 text-transport-stop" />
            Stops Management
          </h1>
          <p className="text-muted-foreground">Manage transport stops and their locations</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="transport-button-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Stop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create New Stop</DialogTitle>
              <DialogDescription>
                Add a new transport stop to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="name">Stop Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="transport-input"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapSelector(!showMapSelector)}
                    className="transport-button-secondary"
                  >
                    <Map className="w-4 h-4 mr-1" />
                    {showMapSelector ? 'Hide Map' : 'Select on Map'}
                  </Button>
                </div>
                
                {showMapSelector && (
                  <MapSelector
                    onLocationSelect={handleLocationSelect}
                    initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
                    initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
                    height="200px"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                      required
                      className="transport-input h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                      required
                      className="transport-input h-9"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cost" className="text-xs">Cost (Optional)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    className="transport-input h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order_number" className="text-xs">Order (Optional)</Label>
                  <Input
                    id="order_number"
                    type="number"
                    value={formData.order_number}
                    onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                    className="transport-input h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="transport-button-primary flex-1">
                  Create Stop
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  className="transport-button-secondary flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transport-input"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredStops.length === 0 ? (
          <Card className="transport-card">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? 'No stops found matching your search.' : 'No stops available. Create your first stop!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStops.map((stop) => (
            <Card key={stop.id} className="transport-card hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-foreground">{stop.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Transport Stop
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(stop)}
                      className="transport-button-secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(stop.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
                    <p className="font-medium">{new Date(stop.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Stop</DialogTitle>
            <DialogDescription>
              Update stop information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Stop Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="transport-input"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMapSelector(!showMapSelector)}
                  className="transport-button-secondary"
                >
                  <Map className="w-4 h-4 mr-1" />
                  {showMapSelector ? 'Hide Map' : 'Select on Map'}
                </Button>
              </div>
              
              {showMapSelector && (
                <MapSelector
                  onLocationSelect={handleLocationSelect}
                  initialLat={formData.latitude ? parseFloat(formData.latitude) : undefined}
                  initialLng={formData.longitude ? parseFloat(formData.longitude) : undefined}
                  height="200px"
                />
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-latitude" className="text-xs">Latitude</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    required
                    className="transport-input h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-longitude" className="text-xs">Longitude</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    required
                    className="transport-input h-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-cost" className="text-xs">Cost (Optional)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  className="transport-input h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-order_number" className="text-xs">Order (Optional)</Label>
                <Input
                  id="edit-order_number"
                  type="number"
                  value={formData.order_number}
                  onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                  className="transport-input h-9"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="transport-button-primary flex-1">
                Update Stop
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditOpen(false)}
                className="transport-button-secondary flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StopsManagement;
