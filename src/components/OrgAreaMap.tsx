import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Building2, Route } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';

interface MapStop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
}

interface MapHub {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
    transport_type: string | null;
}

const OrgAreaMap = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [hubs, setHubs] = useState<MapHub[]>([]);
    const [stops, setStops] = useState<MapStop[]>([]);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!orgData?.org_id) return;

            const { data: hubsData } = await supabase
                .from('hubs')
                .select('id, name, latitude, longitude, address, transport_type')
                .eq('organisation_id', orgData.org_id);

            setHubs((hubsData || []) as MapHub[]);

            // Get stops linked to org routes
            const { data: routesData } = await supabase
                .from('routes')
                .select('id')
                .eq('organisation_id', orgData.org_id);

            if (routesData && routesData.length > 0) {
                const routeIds = routesData.map(r => r.id);
                const { data: routeStops } = await supabase
                    .from('route_stops')
                    .select('stop_id')
                    .in('route_id', routeIds);

                if (routeStops && routeStops.length > 0) {
                    const stopIds = [...new Set(routeStops.map(rs => rs.stop_id))];
                    const { data: stopsData } = await supabase
                        .from('stops')
                        .select('id, name, latitude, longitude')
                        .in('id', stopIds);
                    setStops((stopsData || []).map((s: any) => ({ ...s, address: null })) as MapStop[]);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [orgData]);

    useEffect(() => {
        if (loading || !mapRef.current) return;
        if (mapInstanceRef.current) return;

        const initMap = async () => {
            const L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');

            const org = orgData?.organisation;
            const center: [number, number] = org?.latitude && org?.longitude
                ? [org.latitude, org.longitude]
                : hubs.length > 0
                    ? [hubs[0].latitude, hubs[0].longitude]
                    : [-30.5595, 22.9375]; // SA center

            const map = L.map(mapRef.current!, { zoomControl: true }).setView(center, 12);
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            // Draw org radius if available
            if (org?.latitude && org?.longitude && org?.radius_km) {
                L.circle([org.latitude, org.longitude], {
                    radius: org.radius_km * 1000,
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--primary))',
                    fillOpacity: 0.08,
                    weight: 2,
                    dashArray: '5, 10',
                }).addTo(map);

                // Org center marker
                L.circleMarker([org.latitude, org.longitude], {
                    radius: 8,
                    fillColor: 'hsl(var(--primary))',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.9,
                }).addTo(map).bindPopup(`<b>${org.name}</b><br/>Organisation HQ`);
            }

            // Hub markers (blue)
            hubs.forEach(hub => {
                L.circleMarker([hub.latitude, hub.longitude], {
                    radius: 7,
                    fillColor: '#3b82f6',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.9,
                }).addTo(map).bindPopup(`<b>🏢 ${hub.name}</b><br/>${hub.address || 'Hub'}<br/><small>${hub.transport_type || 'mixed'}</small>`);
            });

            // Stop markers (green, smaller)
            stops.forEach(stop => {
                L.circleMarker([stop.latitude, stop.longitude], {
                    radius: 5,
                    fillColor: '#22c55e',
                    color: '#fff',
                    weight: 1.5,
                    fillOpacity: 0.8,
                }).addTo(map).bindPopup(`<b>📍 ${stop.name}</b><br/>${stop.address || 'Stop'}`);
            });

            // Fit bounds
            const allPoints = [
                ...hubs.map(h => [h.latitude, h.longitude] as [number, number]),
                ...stops.map(s => [s.latitude, s.longitude] as [number, number]),
            ];
            if (allPoints.length > 1) {
                map.fitBounds(L.latLngBounds(allPoints).pad(0.1));
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [loading, hubs, stops, orgData]);

    if (orgLoading || loading) {
        return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6" /> Organisation Area Map</h1>
                <p className="text-muted-foreground">View hubs and stops within your organisation's service area</p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">Organisation Centre</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Hubs ({hubs.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Stops ({stops.length})</span>
                </div>
                {orgData?.organisation?.radius_km && (
                    <Badge variant="outline">Service Radius: {orgData.organisation.radius_km} km</Badge>
                )}
            </div>

            {/* Map */}
            <Card className="transport-card overflow-hidden">
                <CardContent className="p-0">
                    <div ref={mapRef} className="w-full h-[500px]" />
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="transport-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Hubs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{hubs.length}</p>
                        <p className="text-xs text-muted-foreground">{hubs.length > 0 ? hubs.map(h => h.name).join(', ') : 'No hubs in area'}</p>
                    </CardContent>
                </Card>
                <Card className="transport-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" /> Stops</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stops.length}</p>
                        <p className="text-xs text-muted-foreground">Across all organisation routes</p>
                    </CardContent>
                </Card>
                <Card className="transport-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><Route className="w-4 h-4 text-primary" /> Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{orgData?.organisation?.radius_km || '—'} km</p>
                        <p className="text-xs text-muted-foreground">Service radius from centre</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OrgAreaMap;