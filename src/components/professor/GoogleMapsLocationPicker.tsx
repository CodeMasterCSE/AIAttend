import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleMapsLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  proximityRadius?: number | null;
  onLocationChange: (lat: number | null, lng: number | null, radius: number) => void;
  mapboxToken?: string;
}

export function GoogleMapsLocationPicker({
  latitude,
  longitude,
  proximityRadius = 50,
  onLocationChange,
  mapboxToken,
}: GoogleMapsLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const radiusCircle = useRef<string | null>(null);
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [radius, setRadius] = useState(proximityRadius || 50);
  const [tempToken, setTempToken] = useState('');
  const [activeToken, setActiveToken] = useState(mapboxToken || '');

  const hasLocation = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !activeToken) return;

    mapboxgl.accessToken = activeToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: hasLocation ? [longitude!, latitude!] : [88.4031, 22.5726], // Default to Kolkata
        zoom: hasLocation ? 17 : 12,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add click handler to set location
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        updateMarkerAndCircle(lat, lng);
        onLocationChange(lat, lng, radius);
        toast.success('Location set on map');
      });

      // If we have existing location, add marker and circle
      if (hasLocation) {
        map.current.on('load', () => {
          updateMarkerAndCircle(latitude!, longitude!);
        });
      }
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
    };
  }, [activeToken]);

  // Update circle when radius changes
  useEffect(() => {
    if (hasLocation && map.current?.isStyleLoaded()) {
      updateRadiusCircle(latitude!, longitude!);
    }
  }, [radius]);

  const updateMarkerAndCircle = (lat: number, lng: number) => {
    if (!map.current) return;

    // Update or create marker
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      marker.current = new mapboxgl.Marker({ color: '#6366f1' })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }

    updateRadiusCircle(lat, lng);
    
    // Center map on location
    map.current.flyTo({ center: [lng, lat], zoom: 17 });
  };

  const updateRadiusCircle = (lat: number, lng: number) => {
    if (!map.current) return;

    const sourceId = 'radius-circle';
    
    // Create circle GeoJSON
    const circleGeoJSON = createCircleGeoJSON(lat, lng, radius);

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circleGeoJSON);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: circleGeoJSON,
      });

      map.current.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#6366f1',
          'fill-opacity': 0.15,
        },
      });

      map.current.addLayer({
        id: 'radius-circle-stroke',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#6366f1',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    }

    radiusCircle.current = sourceId;
  };

  // Create a circle polygon for the radius
  const createCircleGeoJSON = (lat: number, lng: number, radiusMeters: number): GeoJSON.FeatureCollection => {
    const points = 64;
    const coords: [number, number][] = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = (radiusMeters / 111320) * Math.cos(angle);
      const dy = (radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      coords.push([lng + dy, lat + dx]);
    }
    coords.push(coords[0]); // Close the polygon

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
        },
      ],
    };
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng, radius);
        
        if (map.current) {
          updateMarkerAndCircle(lat, lng);
        }
        
        toast.success('Location captured successfully');
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while getting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
    
    if (map.current && radiusCircle.current) {
      if (map.current.getLayer('radius-circle-fill')) {
        map.current.removeLayer('radius-circle-fill');
      }
      if (map.current.getLayer('radius-circle-stroke')) {
        map.current.removeLayer('radius-circle-stroke');
      }
      if (map.current.getSource(radiusCircle.current)) {
        map.current.removeSource(radiusCircle.current);
      }
      radiusCircle.current = null;
    }
    
    onLocationChange(null, null, radius);
    toast.success('Location cleared');
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (latitude && longitude) {
      onLocationChange(latitude, longitude, newRadius);
    }
  };

  const handleTokenSubmit = () => {
    if (tempToken.trim()) {
      setActiveToken(tempToken.trim());
      toast.success('Mapbox token set successfully');
    }
  };

  // If no token, show token input
  if (!activeToken) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-primary" />
          Classroom GPS Location (Interactive Map)
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Enter your Mapbox public token to enable the interactive map. 
            Get one free at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
          <div className="flex gap-2">
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1Ijoi..."
              value={tempToken}
              onChange={(e) => setTempToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTokenSubmit} disabled={!tempToken.trim()}>
              Set Token
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-primary" />
          Classroom GPS Location (Interactive Map)
        </div>
        {hasLocation && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            Location set
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-64 rounded-lg border overflow-hidden"
      />

      <p className="text-xs text-muted-foreground">
        Click on the map to set the classroom location, or use the button below to capture your current location.
      </p>

      {hasLocation && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Latitude:</span>
            <span className="ml-2 font-mono">{latitude?.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Longitude:</span>
            <span className="ml-2 font-mono">{longitude?.toFixed(6)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="radius" className="text-sm">Proximity Radius (meters)</Label>
        <div className="flex items-center gap-4">
          <Input
            id="radius"
            type="number"
            min={10}
            max={500}
            value={radius}
            onChange={(e) => handleRadiusChange(parseInt(e.target.value) || 50)}
            className="w-32"
          />
          <span className="text-xs text-muted-foreground">
            Students must be within this radius to check in
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          Use Current Location
        </Button>
        {hasLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearLocation}
          >
            Clear Location
          </Button>
        )}
      </div>
    </div>
  );
}
