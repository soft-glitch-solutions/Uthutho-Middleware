import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Target, Plus, Loader2, Navigation2, Trash2, Edit, Route, X } from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cost: number | null;
}

interface RouteLink {
  route_id: string;
  order_number: number;
  route_name: string;
  transport_type: string;
}

const StopMapExplorer = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const selectedMarker = useRef<L.Marker | null>(null);

  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopCost, setNewStopCost] = useState('');
  const [creating, setCreating] = useState(false);

  // Stop detail/edit state
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [linkedRoutes, setLinkedRoutes] = useState<RouteLink[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  // Fetch existing stops
  const fetchStops = useCallback(async () => {
    const { data } = await supabase.from('stops').select('id, name, latitude, longitude, cost');
    if (data) setStops(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  // Fetch linked routes for a stop
  const fetchLinkedRoutes = async (stopId: string) => {
    setLoadingRoutes(true);
    try {
      const { data, error } = await supabase
        .from('route_stops')
        .select('route_id, order_number, routes(name, transport_type)')
        .eq('stop_id', stopId)
        .order('order_number');

      if (error) throw error;

      const routes: RouteLink[] = (data || []).map((rs: any) => ({
        route_id: rs.route_id,
        order_number: rs.order_number,
        route_name: rs.routes?.name || 'Unknown Route',
        transport_type: rs.routes?.transport_type || 'unknown',
      }));
      setLinkedRoutes(routes);
    } catch {
      setLinkedRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Handle clicking on a stop marker
  const handleStopClick = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    setEditName(stop.name);
    setEditCost(stop.cost?.toString() || '');
    setIsEditMode(false);
    setIsDetailOpen(true);
    fetchLinkedRoutes(stop.id);
  }, []);

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

    // Click on empty map area to select location for new stop
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedCoords({ lat, lng });

      if (selectedMarker.current) {
        selectedMarker.current.setLatLng(e.latlng);
      } else {
        const redIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        selectedMarker.current = L.marker(e.latlng, { icon: redIcon }).addTo(map);
        selectedMarker.current.bindPopup('Selected Location').openPopup();
      }
    });

    mapInstance.current = map;
    locateUser(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Render stop markers with click handlers
  useEffect(() => {
    if (!markersLayer.current || loading) return;
    markersLayer.current.clearLayers();

    const blueIcon = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    stops.forEach((stop) => {
      const marker = L.marker([stop.latitude, stop.longitude], { icon: blueIcon });
      marker.bindPopup(
        `<div style="min-width:140px">
          <b>${stop.name}</b><br/>
          <span style="font-size:11px;color:#888">Lat: ${stop.latitude.toFixed(6)}<br/>Lng: ${stop.longitude.toFixed(6)}</span>
          <br/><span style="font-size:11px;color:#3b82f6;cursor:pointer" class="stop-detail-link">Click marker again to manage</span>
        </div>`
      );
      marker.on('click', () => {
        // First click opens popup, second click (or direct call) opens detail
        if (marker.isPopupOpen()) {
          handleStopClick(stop);
        }
      });
      marker.on('popupopen', () => {
        // After popup opens, clicking the marker again triggers detail
        marker.once('click', () => handleStopClick(stop));
      });
      markersLayer.current?.addLayer(marker);
    });
  }, [stops, loading, handleStopClick]);

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
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        L.marker([latitude, longitude], { icon: greenIcon })
          .addTo(m)
          .bindPopup('📍 You are here')
          .openPopup();

        setLocating(false);
        toast({ title: 'Location Found', description: 'Map zoomed to your current location.' });
      },
      () => {
        setLocating(false);
        toast({ title: 'Location Error', description: 'Could not get your location.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateStop = async () => {
    if (!selectedCoords || !newStopName.trim()) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('stops')
        .insert({
          name: newStopName.trim(),
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          cost: newStopCost ? parseFloat(newStopCost) : null,
          image_url: 'https://images.caxton.co.za/wp-content/uploads/sites/10/2023/03/IMG_9281_07602-e1680074626338-780x470.jpg',
        })
        .select('id, name, latitude, longitude, cost')
        .single();

      if (error) throw error;

      setStops((prev) => [...prev, data]);
      setIsCreateOpen(false);
      setNewStopName('');
      setNewStopCost('');
      setSelectedCoords(null);
      if (selectedMarker.current) {
        selectedMarker.current.remove();
        selectedMarker.current = null;
      }
      toast({ title: 'Stop Created', description: `"${data.name}" has been added as a stop.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to create stop.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleEditStop = async () => {
    if (!selectedStop || !editName.trim()) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('stops')
        .update({
          name: editName.trim(),
          cost: editCost ? parseFloat(editCost) : null,
        })
        .eq('id', selectedStop.id);

      if (error) throw error;

      setStops((prev) =>
        prev.map((s) =>
          s.id === selectedStop.id ? { ...s, name: editName.trim(), cost: editCost ? parseFloat(editCost) : null } : s
        )
      );
      setSelectedStop({ ...selectedStop, name: editName.trim(), cost: editCost ? parseFloat(editCost) : null });
      setIsEditMode(false);
      toast({ title: 'Stop Updated', description: `"${editName.trim()}" has been updated.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update stop.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStop = async () => {
    if (!selectedStop) return;
    if (!confirm(`Are you sure you want to delete "${selectedStop.name}"? This will also remove all route links.`)) return;
    setDeleting(true);

    try {
      // Delete route_stops links first
      await supabase.from('route_stops').delete().eq('stop_id', selectedStop.id);

      const { error } = await supabase.from('stops').delete().eq('id', selectedStop.id);
      if (error) throw error;

      setStops((prev) => prev.filter((s) => s.id !== selectedStop.id));
      setIsDetailOpen(false);
      setSelectedStop(null);
      toast({ title: 'Stop Deleted', description: 'The stop has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete stop.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Navigation2 className="w-5 h-5 text-primary" />
            Map Explorer
          </h2>
          <p className="text-sm text-muted-foreground">Click on a stop marker to manage it, or click the map to create a new stop</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => locateUser()} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Target className="w-4 h-4 mr-1" />}
          {locating ? 'Locating...' : 'Find My Location'}
        </Button>
      </div>

      <div className="relative rounded-lg overflow-hidden border shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div ref={mapRef} className="w-full" style={{ height: '500px' }} />
      </div>

      {/* Selected coordinates card */}
      {selectedCoords && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-destructive" />
                Selected Location
              </span>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedCoords(null);
                if (selectedMarker.current) {
                  selectedMarker.current.remove();
                  selectedMarker.current = null;
                }
              }}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Latitude:</span> <span className="font-mono font-medium">{selectedCoords.lat.toFixed(6)}</span></p>
                <p><span className="text-muted-foreground">Longitude:</span> <span className="font-mono font-medium">{selectedCoords.lng.toFixed(6)}</span></p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="transport-button-primary">
                <Plus className="w-4 h-4 mr-1" />
                Create Stop Here
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Existing Stops ({stops.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Selected Location</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--accent))' }} />
          <span>Your Location</span>
        </div>
      </div>

      {/* Create stop dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Stop from Map</DialogTitle>
            <DialogDescription>Create a new stop at the selected coordinates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p><span className="text-muted-foreground">Lat:</span> {selectedCoords?.lat.toFixed(6)}</p>
              <p><span className="text-muted-foreground">Lng:</span> {selectedCoords?.lng.toFixed(6)}</p>
            </div>
            <div className="space-y-2">
              <Label>Stop Name</Label>
              <Input value={newStopName} onChange={(e) => setNewStopName(e.target.value)} placeholder="Enter stop name" className="transport-input" />
            </div>
            <div className="space-y-2">
              <Label>Cost (Optional)</Label>
              <Input type="number" step="0.01" value={newStopCost} onChange={(e) => setNewStopCost(e.target.value)} placeholder="e.g. 15.00" className="transport-input" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateStop} disabled={creating || !newStopName.trim()} className="transport-button-primary flex-1">
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create Stop
              </Button>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop detail / edit / delete dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setIsEditMode(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {isEditMode ? 'Edit Stop' : (selectedStop?.name || 'Stop Details')}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update stop information' : 'View stop details, linked routes, and manage this stop'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isEditMode ? (
              <>
                <div className="space-y-2">
                  <Label>Stop Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="transport-input" />
                </div>
                <div className="space-y-2">
                  <Label>Cost (Optional)</Label>
                  <Input type="number" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="transport-input" />
                </div>
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p><span className="text-muted-foreground">Lat:</span> {selectedStop?.latitude.toFixed(6)}</p>
                  <p><span className="text-muted-foreground">Lng:</span> {selectedStop?.longitude.toFixed(6)}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEditStop} disabled={saving || !editName.trim()} className="transport-button-primary flex-1">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditMode(false)} className="flex-1">Cancel</Button>
                </div>
              </>
            ) : (
              <>
                {/* Stop info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-muted-foreground text-xs mb-1">Coordinates</p>
                    <p className="font-mono text-xs">{selectedStop?.latitude.toFixed(6)}, {selectedStop?.longitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-muted-foreground text-xs mb-1">Cost</p>
                    <p className="font-medium">{selectedStop?.cost ? `R${selectedStop.cost}` : 'Not set'}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteStop}
                    disabled={deleting}
                    className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Delete
                  </Button>
                </div>

                {/* Linked routes */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Route className="w-4 h-4 text-primary" />
                    Linked Routes
                  </h3>
                  {loadingRoutes ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : linkedRoutes.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                      This stop is not linked to any routes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedRoutes.map((route) => (
                        <div key={route.route_id} className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{route.route_name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{route.transport_type}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="font-mono">
                              Position #{route.order_number}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StopMapExplorer;
