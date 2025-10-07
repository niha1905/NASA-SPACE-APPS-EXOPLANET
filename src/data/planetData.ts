export interface PlanetData {
  id: number;
  name: string;
  probability: number;
  radius: number;
  distanceFromStar: number;
  hasWater: boolean;
  hasAtmosphere: boolean;
  isHabitable: boolean;
  color: string;
  type: string;
  temperature: number;
  description?: string;
  surfaceTexture?: string;
  normalMapTexture?: string;
  roughnessMapTexture?: string;
  cloudTexture?: string;
  hasLand?: boolean;
  hasClouds?: boolean;
  atmosphereColor?: string;
  atmosphereOpacity?: number;
  emissiveColor?: string;
  rotationSpeed?: number;
  cloudRotationSpeed?: number;
  atmosphereRotationSpeed?: number;
  isTidallyLocked?: boolean;
  hasIce?: boolean;
  surfaceFeatures?: string[];
}

export const planets: PlanetData[] = [
  {
    id: 1,
    name: "Kepler-452b",
    probability: 0.92,
    radius: 1.6,
    distanceFromStar: 1.05,
    hasWater: true,
    hasAtmosphere: true,
    isHabitable: true,
    color: "#00BFFF", // Deep Sky Blue - more vibrant
    type: "Super Earth",
    temperature: 265,
    description: "Often called Earth's cousin, Kepler-452b orbits a G-type star similar to our Sun. It's a lush, Earth-like world with deep blue oceans and green continents.",
    hasLand: true,
    hasClouds: true,
    atmosphereColor: "#87CEFA", // Light Sky Blue - more visible
    atmosphereOpacity: 0.5, // Increased opacity
    rotationSpeed: 0.004,
    cloudRotationSpeed: 0.006,
    atmosphereRotationSpeed: 0.002,
    isTidallyLocked: false,
    hasIce: false,
    surfaceFeatures: ["Oceans", "Continents", "Clouds", "Forests"],
  },
  {
    id: 2,
    name: "Proxima Centauri b",
    probability: 0.87,
    radius: 1.17,
    distanceFromStar: 0.0485,
    hasWater: false,
    hasAtmosphere: true,
    isHabitable: false,
    color: "#FF4500", // OrangeRed - more vibrant
    type: "Terrestrial",
    temperature: 234,
    description: "The closest known exoplanet to Earth, Proxima Centauri b is likely tidally locked to its red dwarf star, with one side in perpetual daylight and the other in eternal darkness.",
    hasLand: true,
    hasClouds: false,
    atmosphereColor: "#FFA07A", // Light Salmon - more visible
    atmosphereOpacity: 0.3, // Increased opacity
    rotationSpeed: 0.0001,
    atmosphereRotationSpeed: 0.001,
    isTidallyLocked: true,
    hasIce: false,
    surfaceFeatures: ["Craters", "Lava Fields", "Rocky Terrain", "Thin Atmosphere"],
  },
  {
    id: 3,
    name: "TRAPPIST-1e",
    probability: 0.95,
    radius: 0.92,
    distanceFromStar: 0.028,
    hasWater: true,
    hasAtmosphere: true,
    isHabitable: true,
    color: "#4169E1", // Royal Blue - more vibrant
    type: "Terrestrial",
    temperature: 246,
    description: "Part of the famous TRAPPIST-1 system, this ocean world is dominated by deep blue water with scattered volcanic islands and polar ice caps.",
    hasLand: true,
    hasClouds: true,
    atmosphereColor: "#B0E2FF", // Light Blue - more visible
    atmosphereOpacity: 0.4, // Increased opacity
    rotationSpeed: 0.003,
    cloudRotationSpeed: 0.005,
    atmosphereRotationSpeed: 0.0015,
    isTidallyLocked: false,
    hasIce: true,
    surfaceFeatures: ["Oceans", "Volcanic Islands", "Ice Caps", "Dense Clouds"],
  },
  {
    id: 4,
    name: "K2-18b",
    probability: 0.78,
    radius: 2.61,
    distanceFromStar: 0.143,
    hasWater: true,
    hasAtmosphere: true,
    isHabitable: false,
    color: "#1E90FF", // Dodger Blue - more vibrant
    type: "Mini-Neptune",
    temperature: 265,
    description: "A 'Hycean' world with a thick hydrogen-rich atmosphere and a deep global ocean beneath. Recent observations have detected water vapor and potentially methane in its atmosphere.",
    hasLand: false,
    hasClouds: true,
    atmosphereColor: "#E0FFFF", // Light Cyan - more visible
    atmosphereOpacity: 0.6, // Increased opacity
    rotationSpeed: 0.002,
    cloudRotationSpeed: 0.004,
    atmosphereRotationSpeed: 0.003,
    isTidallyLocked: false,
    hasIce: false,
    surfaceFeatures: ["Global Ocean", "Thick Atmosphere", "Hydrogen Clouds", "Water Vapor"],
  },
  {
    id: 5,
    name: "LHS 1140b",
    probability: 0.89,
    radius: 1.43,
    distanceFromStar: 0.0875,
    hasWater: true,
    hasAtmosphere: true,
    isHabitable: true,
    color: "#6A5ACD", // Slate Blue - more vibrant
    type: "Super Earth",
    temperature: 230,
    description: "A rugged, rocky Super-Earth with a dense iron core and possibly a thin atmosphere. Its surface is characterized by mountain ranges and deep canyons.",
    hasLand: true,
    hasClouds: false,
    atmosphereColor: "#B0C4DE", // Light Steel Blue - more visible
    atmosphereOpacity: 0.25, // Increased opacity
    rotationSpeed: 0.003,
    atmosphereRotationSpeed: 0.001,
    isTidallyLocked: false,
    hasIce: true,
    surfaceFeatures: ["Mountains", "Canyons", "Iron-rich Surface", "Thin Atmosphere"],
  },
  {
    id: 6,
    name: "TOI 700d",
    probability: 0.81,
    radius: 1.19,
    distanceFromStar: 0.163,
    hasWater: true,
    hasAtmosphere: true,
    isHabitable: true,
    color: "#32CD32", // Lime Green - more vibrant
    type: "Terrestrial",
    temperature: 269,
    description: "A vibrant, temperate world in the habitable zone of its red dwarf star. It likely has a mix of land and water, with a moderate atmosphere that could support Earth-like weather patterns.",
    hasLand: true,
    hasClouds: true,
    atmosphereColor: "#7FFF00", // Chartreuse - more visible
    atmosphereOpacity: 0.35, // Increased opacity
    rotationSpeed: 0.0025,
    cloudRotationSpeed: 0.004,
    atmosphereRotationSpeed: 0.0015,
    isTidallyLocked: false,
    hasIce: false,
    surfaceFeatures: ["Oceans", "Continents", "Vegetation", "Weather Systems"],
  },
];
