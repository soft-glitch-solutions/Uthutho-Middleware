import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Target, Plus, Loader2, Navigation2 } from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
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
  const { toast } = useToast();

  // Fetch existing stops
  useEffect(() => {
    const fetchStops = async () => {
      const { data } = await supabase.from('stops').select('id, name, latitude, longitude');
      if (data) setStops(data);
      setLoading(false);
    };
    fetchStops();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Fix default marker icons
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

    // Click to select location
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

    // Try to get user location on load
    locateUser(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Add stop markers when stops load
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
      marker.bindPopup(`<b>${stop.name}</b><br/>Lat: ${stop.latitude.toFixed(6)}<br/>Lng: ${stop.longitude.toFixed(6)}`);
      markersLayer.current?.addLayer(marker);
    });
  }, [stops, loading]);

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
        .select('id, name, latitude, longitude')
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Navigation2 className="w-5 h-5 text-primary" />
            Map Explorer
          </h2>
          <p className="text-sm text-muted-foreground">Click on the map to select a location, then create a stop</p>
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
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-destructive" />
              Selected Location
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
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Existing Stops ({stops.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Selected Location</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Your Location</span>
        </div>
      </div>

      {/* Create stop dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Stop from Map</DialogTitle>
            <DialogDescription>
              Create a new stop at the selected coordinates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p><span className="text-muted-foreground">Lat:</span> {selectedCoords?.lat.toFixed(6)}</p>
              <p><span className="text-muted-foreground">Lng:</span> {selectedCoords?.lng.toFixed(6)}</p>
            </div>
            <div className="space-y-2">
              <Label>Stop Name</Label>
              <Input
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="Enter stop name"
                className="transport-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={newStopCost}
                onChange={(e) => setNewStopCost(e.target.value)}
                placeholder="e.g. 15.00"
                className="transport-input"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateStop} disabled={creating || !newStopName.trim()} className="transport-button-primary flex-1">
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create Stop
              </Button>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StopMapExplorer;
