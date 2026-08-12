
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OrganisationGeofenceMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onChange: (lat: number, lng: number, radius: number) => void;
  editable?: boolean;
}

const OrganisationGeofenceMap: React.FC<OrganisationGeofenceMapProps> = ({
  latitude,
  longitude,
  radiusKm,
  onChange,
  editable = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map if not already done
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([latitude || -26.2041, longitude || 28.0473], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance.current);

      if (editable) {
        mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          onChange(lat, lng, radiusKm);
        });
      }
    }

    const center: L.LatLngExpression = [latitude || -26.2041, longitude || 28.0473];

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng(center);
    } else {
      const customIcon = L.divIcon({
        html: `<div class="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      markerRef.current = L.marker(center, { icon: customIcon }).addTo(mapInstance.current);
    }

    // Update circle
    if (circleRef.current) {
      circleRef.current.setLatLng(center);
      circleRef.current.setRadius(radiusKm * 1000);
    } else {
      circleRef.current = L.circle(center, {
        radius: radiusKm * 1000,
        color: 'var(--primary)',
        fillColor: 'var(--primary)',
        fillOpacity: 0.2,
      }).addTo(mapInstance.current);
    }

    // Fly to location if it changes and is not at the map center
    const currentCenter = mapInstance.current.getCenter();
    if (latitude !== 0 && longitude !== 0 && (currentCenter.lat !== latitude || currentCenter.lng !== longitude)) {
        mapInstance.current.flyTo(center, mapInstance.current.getZoom());
    }

    return () => {
      // Cleanup if needed (usually handled by React's lifecycle but good to be careful)
    };
  }, [latitude, longitude, radiusKm, editable, onChange]);

  return (
    <div className="relative w-full h-[300px] rounded-lg overflow-hidden border border-border shadow-inner group">
      <div ref={mapRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-border text-[10px] font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {editable ? 'Click map to set location' : 'Organisation Area'}
      </div>
    </div>
  );
};

export default OrganisationGeofenceMap;
