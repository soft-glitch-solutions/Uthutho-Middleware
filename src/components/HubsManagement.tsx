import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Edit, Trash2, Search, Map, List } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import MapSelector from './MapSelector';
import HubMapExplorer from './HubMapExplorer';

interface Hub {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  transport_type: string;
  image: string;
  created_at: string;
  updated_at: string;
}

const HubsManagement = () => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    transport_type: '',
    image: '',
  });
  const [showMapSelector, setShowMapSelector] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHubs(data || []);
    } catch (error) {
      console.error('Error fetching hubs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch hubs.",
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
        .from('hubs')
        .insert({
          name: formData.name,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          transport_type: formData.transport_type,
          image: formData.image || 'https://images.theconversation.com/files/347103/original/file-20200713-42-1scm7g7.jpg?ixlib=rb-4.1.0&q=45&auto=format&w=1356&h=668&fit=crop',
        })
        .select()
        .single();

      if (error) throw error;

      setHubs([data, ...hubs]);
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Hub created successfully.",
      });
    } catch (error) {
      console.error('Error creating hub:', error);
      toast({
        title: "Error",
        description: "Failed to create hub.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHub) return;

    try {
      const { data, error } = await supabase
        .from('hubs')
        .update({
          name: formData.name,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          transport_type: formData.transport_type,
          image: formData.image,
        })
        .eq('id', selectedHub.id)
        .select()
        .single();

      if (error) throw error;

      setHubs(hubs.map(hub => hub.id === selectedHub.id ? data : hub));
      setIsEditOpen(false);
      setSelectedHub(null);
      resetForm();
      toast({
        title: "Success",
        description: "Hub updated successfully.",
      });
    } catch (error) {
      console.error('Error updating hub:', error);
      toast({
        title: "Error",
        description: "Failed to update hub.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (hubId: string) => {
    if (!confirm('Are you sure you want to delete this hub?')) return;

    try {
      const { error } = await supabase
        .from('hubs')
        .delete()
        .eq('id', hubId);

      if (error) throw error;

      setHubs(hubs.filter(hub => hub.id !== hubId));
      toast({
        title: "Success",
        description: "Hub deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting hub:', error);
      toast({
        title: "Error",
        description: "Failed to delete hub.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (hub: Hub) => {
    setSelectedHub(hub);
    setFormData({
      name: hub.name,
      address: hub.address || '',
      latitude: hub.latitude.toString(),
      longitude: hub.longitude.toString(),
      transport_type: hub.transport_type || '',
      image: hub.image || '',
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      transport_type: '',
      image: '',
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

  const filteredHubs = hubs.filter(hub =>
    hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hub.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hub.transport_type?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <MapPin className="w-8 h-8 text-primary" />
            Transport Hubs
          </h1>
          <p className="text-muted-foreground">Manage transport hubs and their locations</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="transport-button-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Hub
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Hub</DialogTitle>
              <DialogDescription>
                Add a new transport hub to the system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hub Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="transport-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="transport-input"
                />
              </div>
              <div className="space-y-4">
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
                    height="300px"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                      required
                      className="transport-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                      required
                      className="transport-input"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transport_type">Transport Type</Label>
                <Input
                  id="transport_type"
                  value={formData.transport_type}
                  onChange={(e) => setFormData({...formData, transport_type: e.target.value})}
                  placeholder="e.g., Bus, Taxi, Train"
                  className="transport-input"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="transport-button-primary flex-1">
                  Create Hub
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
            placeholder="Search hubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transport-input"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredHubs.length === 0 ? (
          <Card className="transport-card">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? 'No hubs found matching your search.' : 'No hubs available. Create your first hub!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHubs.map((hub) => (
            <Card key={hub.id} className="transport-card hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-foreground">{hub.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {hub.address}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(hub)}
                      className="transport-button-secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(hub.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Coordinates</p>
                    <p className="font-medium">{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transport Type</p>
                    <p className="font-medium">{hub.transport_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(hub.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Hub</DialogTitle>
            <DialogDescription>
              Update hub information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Hub Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="transport-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="transport-input"
              />
            </div>
            <div className="space-y-4">
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
                  height="300px"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-latitude">Latitude</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    required
                    className="transport-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-longitude">Longitude</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    required
                    className="transport-input"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transport_type">Transport Type</Label>
              <Input
                id="edit-transport_type"
                value={formData.transport_type}
                onChange={(e) => setFormData({...formData, transport_type: e.target.value})}
                placeholder="e.g., Bus, Taxi, Train"
                className="transport-input"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="transport-button-primary flex-1">
                Update Hub
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

export default HubsManagement;
