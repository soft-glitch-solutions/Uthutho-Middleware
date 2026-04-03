import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Target, Plus, Loader2, Navigation2, Trash2, Edit, Route, X, ChevronRight, Save, ArrowLeft } from 'lucide-react';

interface Hub {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  transport_type: string | null;
  image: string | null;
}

interface HubRoute {
  id: string;
  name: string;
  transport_type: string;
  start_point: string;
  end_point: string;
  cost: number;
}

const HubMapExplorer = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const selectedMarker = useRef<L.Marker | null>(null);

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Create sidebar
  const [createSidebarOpen, setCreateSidebarOpen] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');
  const [newHubTransportType, setNewHubTransportType] = useState('');
  const [creating, setCreating] = useState(false);

  // View sidebar
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTransportType, setEditTransportType] = useState('');
  const [hubRoutes, setHubRoutes] = useState<HubRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const fetchHubs = useCallback(async () => {
    const { data } = await supabase.from('hubs').select('id, name, address, latitude, longitude, transport_type, image');
    if (data) setHubs(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHubs(); }, [fetchHubs]);

  const fetchHubRoutes = async (hubId: string) => {
    setLoadingRoutes(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, transport_type, start_point, end_point, cost')
        .eq('hub_id', hubId)
        .order('name');

      if (error) throw error;
      setHubRoutes(data || []);
    } catch {
      setHubRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleHubClick = useCallback((hub: Hub) => {
    setSelectedHub(hub);
    setEditName(hub.name);
    setEditAddress(hub.address || '');
    setEditTransportType(hub.transport_type || '');
    setIsEditMode(false);
    setSidebarOpen(true);
    setCreateSidebarOpen(false);
    fetchHubRoutes(hub.id);

    if (mapInstance.current) {
      mapInstance.current.setView([hub.latitude, hub.longitude], 15, { animate: true });
    }
  }, []);

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSelectedHub(null);
    setIsEditMode(false);
  };

  const openCreateSidebar = () => {
    if (!selectedCoords) return;
    setCreateSidebarOpen(true);
    setSidebarOpen(false);
    setNewHubName('');
    setNewHubAddress('');
    setNewHubTransportType('');
  };

  const closeCreateSidebar = () => {
    setCreateSidebarOpen(false);
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current).setView([-26.2041, 28.0473], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedCoords({ lat, lng });
      if (selectedMarker.current) {
        selectedMarker.current.setLatLng(e.latlng);
      } else {
        const redIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });
        selectedMarker.current = L.marker(e.latlng, { icon: redIcon }).addTo(map);
        selectedMarker.current.bindPopup('Selected Location').openPopup();
      }
    });

    mapInstance.current = map;
    locateUser(map);

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Render hub markers
  useEffect(() => {
    if (!markersLayer.current || loading) return;
    markersLayer.current.clearLayers();

    const orangeIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });

    hubs.forEach((hub) => {
      const marker = L.marker([hub.latitude, hub.longitude], { icon: orangeIcon });
      marker.bindTooltip(hub.name, { direction: 'top', offset: [0, -30] });
      marker.on('click', () => handleHubClick(hub));
      markersLayer.current?.addLayer(marker);
    });
  }, [hubs, loading, handleHubClick]);

  useEffect(() => {
    setTimeout(() => {
      mapInstance.current?.invalidateSize();
    }, 350);
  }, [sidebarOpen, createSidebarOpen]);

  const locateUser = (map?: L.Map) => {
    const m = map || mapInstance.current;
    if (!m) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        m.setView([latitude, longitude], 15);
        const greenIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });
        L.marker([latitude, longitude], { icon: greenIcon }).addTo(m).bindPopup('📍 You are here').openPopup();
        setLocating(false);
        toast({ title: 'Location Found', description: 'Map zoomed to your current location.' });
      },
      () => { setLocating(false); toast({ title: 'Location Error', description: 'Could not get your location.', variant: 'destructive' }); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateHub = async () => {
    if (!selectedCoords || !newHubName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('hubs')
        .insert({
          name: newHubName.trim(),
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          address: newHubAddress.trim() || null,
          transport_type: newHubTransportType.trim() || null,
        })
        .select('id, name, address, latitude, longitude, transport_type, image')
        .single();
      if (error) throw error;
      setHubs((prev) => [...prev, data]);
      closeCreateSidebar();
      setSelectedCoords(null);
      if (selectedMarker.current) { selectedMarker.current.remove(); selectedMarker.current = null; }
      toast({ title: 'Hub Created', description: `"${data.name}" has been added.` });
    } catch { toast({ title: 'Error', description: 'Failed to create hub.', variant: 'destructive' }); }
    finally { setCreating(false); }
  };

  const handleEditHub = async () => {
    if (!selectedHub || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('hubs').update({
        name: editName.trim(),
        address: editAddress.trim() || null,
        transport_type: editTransportType.trim() || null,
      }).eq('id', selectedHub.id);
      if (error) throw error;
      const updated = { ...selectedHub, name: editName.trim(), address: editAddress.trim() || null, transport_type: editTransportType.trim() || null };
      setHubs((prev) => prev.map((h) => h.id === selectedHub.id ? updated : h));
      setSelectedHub(updated);
      setIsEditMode(false);
      toast({ title: 'Hub Updated', description: `"${editName.trim()}" updated.` });
    } catch { toast({ title: 'Error', description: 'Failed to update hub.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDeleteHub = async () => {
    if (!selectedHub) return;
    if (!confirm(`Delete "${selectedHub.name}"?`)) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('hubs').delete().eq('id', selectedHub.id);
      if (error) throw error;
      setHubs((prev) => prev.filter((h) => h.id !== selectedHub.id));
      closeSidebar();
      toast({ title: 'Hub Deleted', description: 'The hub has been removed.' });
    } catch { toast({ title: 'Error', description: 'Failed to delete hub.', variant: 'destructive' }); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Navigation2 className="w-5 h-5 text-primary" />
            Hub Map Explorer
          </h2>
          <p className="text-sm text-muted-foreground">Click a hub marker to view details and linked routes, or click the map to add a new hub</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => locateUser()} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Target className="w-4 h-4 mr-1" />}
          {locating ? 'Locating...' : 'Find My Location'}
        </Button>
      </div>

      <div className="flex rounded-lg overflow-hidden border shadow-sm" style={{ height: '560px' }}>
        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          <div className="absolute bottom-3 left-3 z-[500] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(30, 100%, 50%)' }} />
                <span>Hubs ({hubs.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                <span>You</span>
              </div>
            </div>
          </div>
        </div>

        {/* View hub sidebar */}
        <div className={`bg-background border-l transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-[340px]' : 'w-0'}`}>
          {sidebarOpen && selectedHub && (
            <div className="w-[340px] h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-sm truncate">
                    {isEditMode ? 'Edit Hub' : selectedHub.name}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeSidebar} className="h-7 w-7 p-0 flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {isEditMode ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hub Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="transport-input h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Address</Label>
                        <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="transport-input h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Transport Type</Label>
                        <Input value={editTransportType} onChange={(e) => setEditTransportType(e.target.value)} placeholder="e.g. Bus, Taxi" className="transport-input h-9" />
                      </div>
                      <div className="bg-muted/50 rounded-md p-2.5 text-xs font-mono">
                        <p>Lat: {selectedHub.latitude.toFixed(6)}</p>
                        <p>Lng: {selectedHub.longitude.toFixed(6)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleEditHub} disabled={saving || !editName.trim()} size="sm" className="transport-button-primary flex-1">
                          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)} className="flex-1">
                          <ArrowLeft className="w-3 h-3 mr-1" />
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</h4>
                        <div className="space-y-2">
                          <div className="bg-muted/50 rounded-md p-2.5">
                            <p className="text-muted-foreground text-[10px] mb-0.5">Address</p>
                            <p className="text-xs">{selectedHub.address || '—'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/50 rounded-md p-2.5">
                              <p className="text-muted-foreground text-[10px] mb-0.5">Coordinates</p>
                              <p className="font-mono text-xs">{selectedHub.latitude.toFixed(4)}, {selectedHub.longitude.toFixed(4)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-md p-2.5">
                              <p className="text-muted-foreground text-[10px] mb-0.5">Transport</p>
                              <p className="text-xs">{selectedHub.transport_type || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="flex-1 h-8 text-xs">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteHub}
                          disabled={deleting}
                          className="flex-1 h-8 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          {deleting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
                          Delete
                        </Button>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Route className="w-3 h-3" />
                          Hub Routes
                        </h4>

                        {loadingRoutes ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : hubRoutes.length === 0 ? (
                          <div className="text-center py-4 bg-muted/30 rounded-md">
                            <Route className="w-5 h-5 mx-auto mb-1 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground">No routes linked to this hub</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {hubRoutes.map((route) => (
                              <div key={route.id} className="bg-muted/40 rounded-lg p-2.5 space-y-1.5 hover:bg-muted/60 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium leading-tight">{route.name}</p>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                    R{route.cost}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {route.transport_type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <span className="truncate">{route.start_point}</span>
                                  <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate">{route.end_point}</span>
                                </div>
                              </div>
                            ))}
                            <p className="text-[10px] text-muted-foreground text-center pt-1">
                              {hubRoutes.length} route{hubRoutes.length !== 1 ? 's' : ''} linked
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Create hub sidebar */}
        <div className={`bg-background border-l transition-all duration-300 ease-in-out overflow-hidden ${createSidebarOpen ? 'w-[340px]' : 'w-0'}`}>
          {createSidebarOpen && selectedCoords && (
            <div className="w-[340px] h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-sm">Create New Hub</span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeCreateSidebar} className="h-7 w-7 p-0 flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  <div className="bg-muted/50 rounded-md p-2.5 text-xs font-mono">
                    <p>Lat: {selectedCoords.lat.toFixed(6)}</p>
                    <p>Lng: {selectedCoords.lng.toFixed(6)}</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Hub Name *</Label>
                    <Input
                      value={newHubName}
                      onChange={(e) => setNewHubName(e.target.value)}
                      placeholder="Enter hub name"
                      className="transport-input h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Address</Label>
                    <Input
                      value={newHubAddress}
                      onChange={(e) => setNewHubAddress(e.target.value)}
                      placeholder="Enter address"
                      className="transport-input h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Transport Type</Label>
                    <Input
                      value={newHubTransportType}
                      onChange={(e) => setNewHubTransportType(e.target.value)}
                      placeholder="e.g. Bus, Taxi, Train"
                      className="transport-input h-9"
                    />
                  </div>

                  <Separator />

                  <Button
                    onClick={handleCreateHub}
                    disabled={creating || !newHubName.trim()}
                    className="transport-button-primary w-full"
                  >
                    {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Create Hub
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Selected coordinates card */}
      {selectedCoords && !createSidebarOpen && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-destructive" />
                Selected Location
              </span>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedCoords(null);
                if (selectedMarker.current) { selectedMarker.current.remove(); selectedMarker.current = null; }
              }}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Lat:</span> <span className="font-mono font-medium">{selectedCoords.lat.toFixed(6)}</span></p>
                <p><span className="text-muted-foreground">Lng:</span> <span className="font-mono font-medium">{selectedCoords.lng.toFixed(6)}</span></p>
              </div>
              <Button onClick={openCreateSidebar} className="transport-button-primary">
                <Plus className="w-4 h-4 mr-1" />
                Create Hub Here
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HubMapExplorer;
