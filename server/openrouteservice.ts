import type { TableRow } from "@shared/schema";

const OPENROUTESERVICE_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
const QL_KITCHEN_LOCATION = {
  latitude: 3.0738,
  longitude: 101.5183,
};

interface ORSRouteResponse {
  routes?: Array<{
    summary: {
      distance: number;  // in meters
      duration: number;  // in seconds
    };
    segments?: Array<{
      distance: number;
      duration: number;
    }>;
  }>;
}

interface RouteCalculationResult {
  distanceKm: number;
  tollPrice: number;
}

/**
 * Calculate route distance from QL Kitchen to a destination using OpenRouteService
 * Optimized for lorry (HGV) vehicle routing
 * @param destination The destination row with latitude and longitude
 * @returns Object containing distance in kilometers and toll price (0 for now as ORS doesn't provide toll info)
 */
export async function calculateRouteForLorry(destination: TableRow): Promise<RouteCalculationResult> {
  if (!OPENROUTESERVICE_API_KEY) {
    console.warn("OpenRouteService API key not configured");
    return { distanceKm: 0, tollPrice: 0 };
  }

  if (!destination.latitude || !destination.longitude) {
    console.warn(`No coordinates for destination: ${destination.location}`);
    return { distanceKm: 0, tollPrice: 0 };
  }

  try {
    const url = "https://api.openrouteservice.org/v2/directions/driving-hgv/json";
    
    // OpenRouteService uses [longitude, latitude] format (opposite of Google Maps!)
    const requestBody = {
      coordinates: [
        [QL_KITCHEN_LOCATION.longitude, QL_KITCHEN_LOCATION.latitude],
        [parseFloat(destination.longitude.toString()), parseFloat(destination.latitude.toString())]
      ],
      preference: "shortest", // Shortest route (can also use "fastest" or "recommended")
      units: "m", // Return distances in meters
      language: "en",
      geometry: false, // We don't need the full geometry, just distance
      instructions: false, // We don't need turn-by-turn instructions
      elevation: false,
      extra_info: [],
      options: {
        vehicle_type: "hgv", // Heavy Goods Vehicle (lorry)
        avoid_features: ["ferries"], // Avoid ferries for lorries
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": OPENROUTESERVICE_API_KEY,
        "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8"
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        console.warn(`OpenRouteService rate limit exceeded for ${destination.location}. Please wait before retrying.`);
      } else {
        console.error(`OpenRouteService API error: ${response.status} - ${errorText}`);
      }
      
      return { distanceKm: 0, tollPrice: 0 };
    }

    const data: ORSRouteResponse = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn(`No route found for destination: ${destination.location}`);
      return { distanceKm: 0, tollPrice: 0 };
    }

    const route = data.routes[0];
    
    // Extract distance in kilometers (ORS returns meters)
    const distanceKm = route.summary?.distance 
      ? Math.round((route.summary.distance / 1000) * 10) / 10 
      : 0;
    
    // Note: OpenRouteService doesn't provide toll information
    // Toll prices would need to be calculated separately or from another service
    const tollPrice = 0;
    
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

  // Process destinations serially with rate limiting
  // OpenRouteService free tier: 40 requests/minute, 2000 requests/day
  // To stay safely under 40/min, we wait 1500ms between each request (40 requests per 60 seconds)
  
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    
    try {
      const result = await calculateRouteForLorry(dest);
      distances[dest.id] = result.distanceKm;
      tollPrices[dest.id] = result.tollPrice;
    } catch (error) {
      console.error(`Failed to calculate route for ${dest.location}:`, error);
      distances[dest.id] = 0;
      tollPrices[dest.id] = 0;
    }

    // Wait 1500ms between requests to respect 40 req/min limit
    // Skip delay after the last request
    if (i < destinations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return { distances, tollPrices };
}


