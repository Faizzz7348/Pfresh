import type { TableRow } from "@shared/schema";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_API_KEY;
const QL_KITCHEN_LOCATION = {
  latitude: 3.0738,
  longitude: 101.5183,
};

interface MoneyObject {
  currencyCode: string;
  units?: string;
  nanos?: number;
}

interface TollInfo {
  estimatedPrice?: MoneyObject[];
}

interface RouteResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    travelAdvisory?: {
      tollInfo?: TollInfo;
    };
  }>;
}

interface RouteCalculationResult {
  distanceKm: number;
  tollPrice: number;
}

/**
 * Calculate route distance and toll price from QL Kitchen to a destination using Google Maps Routes API
 * Optimized for lorry vehicle with shortest road routes
 * @param destination The destination row with latitude and longitude
 * @returns Object containing distance in kilometers and toll price in MYR
 */
export async function calculateRouteForLorry(destination: TableRow): Promise<RouteCalculationResult> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return { distanceKm: 0, tollPrice: 0 };
  }

  if (!destination.latitude || !destination.longitude) {
    console.warn(`No coordinates for destination: ${destination.location}`);
    return { distanceKm: 0, tollPrice: 0 };
  }

  try {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: QL_KITCHEN_LOCATION.latitude,
            longitude: QL_KITCHEN_LOCATION.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: parseFloat(destination.latitude.toString()),
            longitude: parseFloat(destination.longitude.toString()),
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL", // Optimizes for shortest route considering traffic
      computeAlternativeRoutes: false,
      routeModifiers: {
        vehicleInfo: {
          emissionType: "DIESEL",
        },
        avoidTolls: false, // We want toll info for lorries
        avoidHighways: false, // Lorries use highways
        avoidFerries: true, // Avoid ferries for lorries when possible
      },
      extraComputations: ["TOLLS"],
      units: "METRIC",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Maps API error: ${response.status} - ${errorText}`);
      return { distanceKm: 0, tollPrice: 0 };
    }

    const data: RouteResponse = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn(`No route found for destination: ${destination.location}`);
      return { distanceKm: 0, tollPrice: 0 };
    }

    const route = data.routes[0];
    
    // Extract distance in kilometers
    const distanceKm = route.distanceMeters ? Math.round((route.distanceMeters / 1000) * 10) / 10 : 0;
    
    // Extract toll information
    const tollInfo = route.travelAdvisory?.tollInfo;
    let tollPrice = 0;
    
    if (tollInfo && tollInfo.estimatedPrice && tollInfo.estimatedPrice.length > 0) {
      // Google Maps returns toll prices in the Money object format
      // estimatedPrice is an array of Money objects (usually one for MYR in Malaysia)
      // Find MYR entry or use the first one
      const myrToll = tollInfo.estimatedPrice.find(price => price.currencyCode === 'MYR') 
        || tollInfo.estimatedPrice[0];
      
      if (myrToll) {
        // Convert Money object to decimal: units + (nanos / 1000000000)
        const units = parseFloat(myrToll.units || '0');
        const nanos = (myrToll.nanos || 0) / 1000000000;
        tollPrice = units + nanos;
        
        // Apply class 1 lorry pricing adjustment if needed
        // Google Maps may not have vehicle class-specific pricing,
        // so we apply a multiplier based on Malaysian toll rates
        // Class 1 lorries (under 3.5 tons) typically pay standard rates
        const class1Multiplier = 1.0; // No adjustment needed for class 1
        
        tollPrice = Math.round(tollPrice * class1Multiplier * 100) / 100;
      }
    }
    
    return { distanceKm, tollPrice };
  } catch (error) {
    console.error(`Error calculating route for ${destination.location}:`, error);
    return { distanceKm: 0, tollPrice: 0 };
  }
}



/**
 * Calculate routes (distance and toll prices) for multiple destinations in batch
 * Uses lorry-optimized routing with shortest road preference
 * @param destinations Array of destination rows
 * @returns Object with distances and toll prices for each destination
 */
export async function calculateRoutesForDestinations(
  destinations: TableRow[]
): Promise<{ distances: Record<string, number>; tollPrices: Record<string, number> }> {
  const distances: Record<string, number> = {};
  const tollPrices: Record<string, number> = {};

  // Process destinations in parallel with rate limiting
  const batchSize = 5; // Process 5 at a time to avoid rate limits
  
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const promises = batch.map(async (dest) => {
      const result = await calculateRouteForLorry(dest);
      return { id: dest.id, distanceKm: result.distanceKm, toll: result.tollPrice };
    });

    const results = await Promise.all(promises);
    results.forEach(({ id, distanceKm, toll }) => {
      distances[id] = distanceKm;
      tollPrices[id] = toll;
    });

    // Small delay between batches to respect rate limits
    if (i + batchSize < destinations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { distances, tollPrices };
}


