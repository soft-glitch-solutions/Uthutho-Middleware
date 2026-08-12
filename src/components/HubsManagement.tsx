import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Map Explorer
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <HubMapExplorer />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search hubs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 transport-input"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Transport Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {searchTerm ? 'No hubs found matching your search.' : 'No hubs available. Create your first hub!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHubs.map((hub) => (
                      <TableRow key={hub.id}>
                        <TableCell className="font-medium text-foreground">{hub.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{hub.address}</TableCell>
                        <TableCell className="text-muted-foreground">{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</TableCell>
                        <TableCell>{hub.transport_type || 'Not specified'}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(hub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HubsManagement;
