import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Maximize2, Filter, X, Navigation } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import L from "leaflet";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Function to get route color based on route code
const getRouteColor = (code?: string): string => {
  if (!code) return 'black';
  
  const routeCode = code.toLowerCase().trim();
  
  // Color mapping for different routes
  // KL Routes
  if (routeCode.includes('kl 7') || routeCode.includes('kl7')) return 'blue';
  if (routeCode.includes('kl 6') || routeCode.includes('kl6')) return 'green';
  if (routeCode.includes('kl 4') || routeCode.includes('kl4')) return 'red';
  if (routeCode.includes('kl 3') || routeCode.includes('kl3')) return 'orange';
  if (routeCode.includes('kl 1') || routeCode.includes('kl1')) return 'violet';
  if (routeCode.includes('kl 5') || routeCode.includes('kl5')) return 'yellow';
  if (routeCode.includes('kl 9') || routeCode.includes('kl9')) return 'grey';
  
  // SL Routes
  if (routeCode.includes('sl 1') || routeCode.includes('sl1')) return 'gold';
  if (routeCode.includes('sl 2') || routeCode.includes('sl2')) return 'blue';
  if (routeCode.includes('sl 3') || routeCode.includes('sl3')) return 'grey';
  
  // Set Routes
  if (routeCode.includes('set 1') || routeCode.includes('set1')) return 'grey';
  if (routeCode.includes('set 2') || routeCode.includes('set2')) return 'red';
  if (routeCode.includes('set 3') || routeCode.includes('set3')) return 'orange';
  
  // Special locations
  if (routeCode.includes('warehouse')) return 'black';
  
  // Default color for other routes
  return 'black';
};

// Cached icons for better performance - avoid recreating on each render
const iconCache = new Map<string, L.Icon>();

// Create custom colored marker from hex color using SVG
const createCustomColorIcon = (hexColor: string, isCurrent: boolean = false) => {
  const cacheKey = `custom-${hexColor}-${isCurrent}`;
  
  if (!iconCache.has(cacheKey)) {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path fill="${hexColor}" stroke="#000" stroke-width="1" d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
      </svg>
    `;
    
    const iconUrl = 'data:image/svg+xml;base64,' + btoa(svgIcon);
    
    iconCache.set(cacheKey, new L.Icon({
      iconUrl: iconUrl,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [12, 18],        // Smaller size
      iconAnchor: [6, 18],        // Adjusted anchor
      popupAnchor: [0, -16],      // Adjusted popup anchor
      shadowSize: [15, 15],       // Reduced shadow
      className: isCurrent ? 'current-location-marker' : ''
    }));
  }
  
  return iconCache.get(cacheKey)!;
};

// Create smaller colored marker icons (reduced from 18x30 to 12x20)
const createColoredIcon = (color: string, isCurrent: boolean = false) => {
  const cacheKey = `${color}-${isCurrent}`;
  
  if (!iconCache.has(cacheKey)) {
    iconCache.set(cacheKey, new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [12, 20],        // Reduced from [18, 30]
      iconAnchor: [6, 20],        // Adjusted anchor
      popupAnchor: [0, -18],      // Adjusted popup anchor
      shadowSize: [15, 15],       // Reduced shadow
      className: isCurrent ? 'current-location-marker' : ''
    }));
  }
  
  return iconCache.get(cacheKey)!;
};

interface MapLocation {
  latitude: number;
  longitude: number;
  label: string;
  code?: string;
  isCurrent?: boolean;
  markerColor?: string;
}

interface MiniMapProps {
  locations: MapLocation[];
  height?: string;
  showFullscreenButton?: boolean;
}

function MapResizer({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !map.getContainer()) return;
    
    try {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
      
      // Optimized delay for proper rendering
      const timeout = setTimeout(() => {
        try {
          if (map?.getContainer()?.parentNode) {
            map.invalidateSize({ animate: false });
          }
        } catch (sizeError: any) {
          // Silently handle sizing errors during cleanup
          console.debug('Map invalidateSize skipped:', sizeError?.message || 'Unknown error');
        }
      }, 100);

      return () => clearTimeout(timeout);
    } catch (error) {
      console.warn('Map error:', error);
    }
  }, [map, center, zoom]);

  return null;
}

// Component to handle "back to current marker" functionality
function BackToCurrentButton({ 
  currentLocation 
}: { 
  currentLocation: MapLocation | undefined 
}) {
  const map = useMap();

  const handleBackToCurrent = useCallback(() => {
    if (currentLocation && map) {
      map.setView(
        [currentLocation.latitude, currentLocation.longitude], 
        15, 
        { animate: true, duration: 0.8 }
      );
    }
  }, [currentLocation, map]);

  if (!currentLocation) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackToCurrent}
        className="bg-white/95 dark:bg-gray-900/95 hover:bg-white dark:hover:bg-gray-800/80 shadow-lg border-2 border-blue-500 hover:border-blue-600 dark:border-blue-400 dark:hover:border-blue-300 backdrop-blur-sm"
        data-testid="button-back-to-current"
        title="Back to current location"
      >
        <Navigation className="w-4 h-4 text-blue-500 dark:text-blue-400" />
      </Button>
    </div>
  );
}

export const MiniMap = memo(function MiniMap({
  locations,
  height = "500px",
  showFullscreenButton = true,
}: MiniMapProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);

  // Get unique routes from locations
  const uniqueRoutes = useMemo(() => {
    const routes = locations
      .map(loc => loc.code)
      .filter((code): code is string => !!code)
      .filter((code, index, arr) => arr.indexOf(code) === index)
      .sort();
    return routes;
  }, [locations]);

  // Initialize selectedRoutes with all routes
  useEffect(() => {
    if (uniqueRoutes.length > 0 && selectedRoutes.length === 0) {
      setSelectedRoutes(uniqueRoutes);
    }
  }, [uniqueRoutes]);

  const toggleRoute = (route: string) => {
    setSelectedRoutes(prev => 
      prev.includes(route) 
        ? prev.filter(r => r !== route)
        : [...prev, route]
    );
  };

  const selectAllRoutes = () => {
    setSelectedRoutes(uniqueRoutes);
  };

  const clearAllRoutes = () => {
    setSelectedRoutes([]);
  };

  const MapContent = ({ isFullscreen = false }: { isFullscreen?: boolean }) => {
    // For mini view: show only current location; for fullscreen: filter by selected routes
    // Memoized to avoid recalculation on every render
    const renderedLocations = useMemo(() => {
      return isFullscreen 
        ? locations.filter(loc => !loc.code || selectedRoutes.includes(loc.code))
        : locations.filter(l => l.isCurrent).length 
          ? locations.filter(l => l.isCurrent) 
          : [locations[0]];
    }, [isFullscreen, selectedRoutes]);

    // Find current location for "back to current" button
    const currentLocation = useMemo(() => 
      locations.find(loc => loc.isCurrent), 
      [locations]
    );

    // Calculate center and zoom from rendered locations - memoized for performance
    const center = useMemo((): [number, number] => {
      if (renderedLocations.length === 0) return [3.139003, 101.686855];
      const avgLat = renderedLocations.reduce((sum, loc) => sum + loc.latitude, 0) / renderedLocations.length;
      const avgLng = renderedLocations.reduce((sum, loc) => sum + loc.longitude, 0) / renderedLocations.length;
      return [avgLat, avgLng];
    }, [renderedLocations]);

    const zoom = useMemo((): number => {
      if (renderedLocations.length <= 1) return 15;
      const lats = renderedLocations.map((loc) => loc.latitude);
      const lngs = renderedLocations.map((loc) => loc.longitude);
      const latRange = Math.max(...lats) - Math.min(...lats);
      const lngRange = Math.max(...lngs) - Math.min(...lngs);
      const maxRange = Math.max(latRange, lngRange);
      if (maxRange > 5) return 8;
      if (maxRange > 2) return 10;
      if (maxRange > 1) return 12;
      if (maxRange > 0.5) return 13;
      if (maxRange > 0.1) return 14;
      return 15;
    }, [renderedLocations]);

    return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: isFullscreen ? "100%" : height, width: "100%" }}
      className="rounded-lg border border-border"
      preferCanvas={true}
      zoomControl={isFullscreen}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        updateWhenIdle={true}
        updateWhenZooming={false}
        keepBuffer={2}
      />
      <MapResizer center={center} zoom={zoom} />
      {isFullscreen && <BackToCurrentButton currentLocation={currentLocation} />}
      {renderedLocations.map((location, index) => {
        // Use custom marker color if provided, otherwise use route-based color
        const markerColor = location.markerColor || getRouteColor(location.code);
        const markerIcon = location.markerColor && location.markerColor.startsWith('#')
          ? createCustomColorIcon(location.markerColor, location.isCurrent)
          : createColoredIcon(markerColor, location.isCurrent);
        
        return (
          <Marker 
            key={`${location.latitude}-${location.longitude}-${index}`}
            position={[location.latitude, location.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="font-semibold">{location.label}</div>
                {location.code && (
                  <div className="text-sm font-medium" style={{ color: markerColor === 'black' ? '#000' : markerColor }}>
                    Route: {location.code}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    );
  };

  if (locations.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-muted rounded-lg border border-border"
      >
        <p className="text-sm text-muted-foreground">
          No location data available
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-auto">
        <MapContent />
      </div>
      
      {showFullscreenButton && (
        <div className="absolute top-2 right-2 z-[1001] pointer-events-auto">
          <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/95 dark:bg-gray-900/95 hover:bg-white dark:hover:bg-gray-800/80 shadow-lg border-2 border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-500 backdrop-blur-sm pointer-events-auto"
                data-testid="button-fullscreen-map"
              >
                <Maximize2 className="w-4 h-4 text-gray-900 dark:text-gray-100" />
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-[95vw] w-full p-6"
              style={{
                height: 'min(90vh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px))',
                touchAction: 'pan-y',
              }}
            >
              <DialogHeader 
                className="flex flex-row items-center justify-between space-y-0"
                style={{ paddingTop: 'max(0rem, env(safe-area-inset-top))' }}
              >
                <DialogTitle className="tracking-tight font-semibold text-[12px]">
                  Map View - {locations.length === 1 
                    ? locations[0].label 
                    : `${locations.length} Locations`}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Interactive map showing delivery locations with route filters
                </DialogDescription>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="button-filter-routes"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Filter Routes ({selectedRoutes.length}/{uniqueRoutes.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Select Routes</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={selectAllRoutes}
                              className="h-7 text-xs"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllRoutes}
                              className="h-7 text-xs"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {uniqueRoutes.map((route) => {
                            const routeColor = getRouteColor(route);
                            return (
                              <div key={route} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`route-${route}`}
                                  checked={selectedRoutes.includes(route)}
                                  onCheckedChange={() => toggleRoute(route)}
                                />
                                <Label
                                  htmlFor={`route-${route}`}
                                  className="flex items-center gap-2 cursor-pointer flex-1"
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: routeColor === 'black' ? '#000' : routeColor }}
                                  />
                                  <span className="text-sm">{route}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="pagination-button text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      data-testid="button-close-map"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>
              <div 
                className="mt-4"
                style={{
                  height: 'min(calc(90vh - 100px), calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 140px))',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
              >
                <MapContent isFullscreen />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if locations array actually changed (deep comparison)
  if (prevProps.locations.length !== nextProps.locations.length) return false;
  if (prevProps.height !== nextProps.height) return false;
  if (prevProps.showFullscreenButton !== nextProps.showFullscreenButton) return false;
  
  // Compare each location object
  for (let i = 0; i < prevProps.locations.length; i++) {
    const prev = prevProps.locations[i];
    const next = nextProps.locations[i];
    if (
      prev.latitude !== next.latitude ||
      prev.longitude !== next.longitude ||
      prev.label !== next.label ||
      prev.code !== next.code ||
      prev.isCurrent !== next.isCurrent ||
      prev.markerColor !== next.markerColor
    ) {
      return false;
    }
  }
  
  return true; // Props are equal, don't re-render
});
