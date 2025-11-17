/**
 * Physics-based calculations for exoplanet properties
 * Provides accurate backup calculations based on planetary physics
 */

const G = 6.67430e-11;              // Gravitational constant (m^3 kg^-1 s^-2)
const SIGMA = 5.670374419e-8;       // Stefan-Boltzmann constant (W m^-2 K^-4)
const M_SUN = 1.98847e30;           // Solar mass (kg)
const R_SUN = 6.957e8;              // Solar radius (m)
const L_SUN = 3.828e26;             // Solar luminosity (W)
const AU = 1.495978707e11;          // Astronomical unit (m)
const M_EARTH = 5.972e24;           // Earth mass (kg)
const R_EARTH = 6.371e6;            // Earth radius (m)

export interface PhysicsCalculationInput {
  // Orbital parameters
  orbitalPeriodDays?: number;
  semiMajorAxisAU?: number;
  
  // Planet parameters
  radiusEarth?: number;
  massEarth?: number;
  
  // Star parameters
  starTempK?: number;
  starRadiusSolar?: number;
  starMassSolar?: number;
  starLuminositySolar?: number;
  
  // Light curve features
  transitDepthPPM?: number;
  transitDurationHours?: number;
}

export interface PhysicsCalculationResult {
  // Calculated orbital parameters
  orbitalPeriodDays: number;
  semiMajorAxisAU: number;
  equilibriumTemperatureK: number;
  
  // Habitable zone
  habitableZoneInnerAU: number;
  habitableZoneOuterAU: number;
  inHabitableZone: boolean;
  
  // Planet properties
  surfaceGravityMS2: number;
  escapeVelocityMS: number;
  densityGCM3: number;
  
  // Stellar properties
  starLuminositySolar: number;
  starRadiusM: number;
  
  // Validation
  isPhysicallyPlausible: boolean;
  warnings: string[];
}

class PhysicsCalculationService {
  /**
   * Calculate semi-major axis from orbital period using Kepler's 3rd law
   */
  calculateSemiMajorAxis(periodDays: number, starMassSolar: number = 1.0): number {
    if (periodDays <= 0 || starMassSolar <= 0) {
      return NaN;
    }
    
    const P = periodDays * 24.0 * 3600.0;  // Convert to seconds
    const M = starMassSolar * M_SUN;       // Convert to kg
    
    // Kepler's 3rd law: a^3 = GMT^2 / (4π^2)
    const a_cubed = G * M * P * P / (4.0 * Math.PI * Math.PI);
    const a = Math.cbrt(a_cubed);
    
    return a / AU;  // Return in AU
  }

  /**
   * Calculate orbital period from semi-major axis using Kepler's 3rd law
   */
  calculateOrbitalPeriod(semiMajorAxisAU: number, starMassSolar: number = 1.0): number {
    if (semiMajorAxisAU <= 0 || starMassSolar <= 0) {
      return NaN;
    }
    
    const a = semiMajorAxisAU * AU;        // Convert to meters
    const M = starMassSolar * M_SUN;       // Convert to kg
    
    // T = 2π * sqrt(a^3 / GM)
    const T_squared = (4.0 * Math.PI * Math.PI * a * a * a) / (G * M);
    const T = Math.sqrt(T_squared);
    
    return T / (24.0 * 3600.0);  // Return in days
  }

  /**
   * Calculate stellar luminosity from radius and temperature
   */
  calculateStellarLuminosity(radiusSolar: number, tempK: number): number {
    if (radiusSolar <= 0 || tempK <= 0) {
      return NaN;
    }
    
    const R = radiusSolar * R_SUN;
    const L = 4.0 * Math.PI * R * R * SIGMA * Math.pow(tempK, 4);
    
    return L / L_SUN;  // Return in solar luminosities
  }

  /**
   * Calculate equilibrium temperature of planet
   */
  calculateEquilibriumTemperature(
    starTempK: number,
    starRadiusSolar: number,
    semiMajorAxisAU: number,
    albedo: number = 0.3
  ): number {
    if (starTempK <= 0 || starRadiusSolar <= 0 || semiMajorAxisAU <= 0) {
      return NaN;
    }
    
    const a = semiMajorAxisAU * AU;
    const R_star = starRadiusSolar * R_SUN;
    
    // T_eq = T_star * sqrt(R_star / (2*a)) * (1-A)^0.25
    const term = Math.sqrt(R_star / (2.0 * a));
    const absorption = Math.pow(1.0 - albedo, 0.25);
    
    return starTempK * term * absorption;
  }

  /**
   * Calculate habitable zone bounds
   */
  calculateHabitableZone(starLuminositySolar: number): { inner: number; outer: number } {
    if (starLuminositySolar <= 0) {
      return { inner: NaN, outer: NaN };
    }
    
    const scale = Math.sqrt(starLuminositySolar);
    
    // Conservative habitable zone estimates
    const inner = 0.95 * scale;  // Inner edge (runaway greenhouse)
    const outer = 1.67 * scale;  // Outer edge (maximum greenhouse)
    
    return { inner, outer };
  }

  /**
   * Calculate surface gravity
   */
  calculateSurfaceGravity(radiusEarth: number, massEarth: number): number {
    if (radiusEarth <= 0 || massEarth <= 0) {
      return NaN;
    }
    
    const R = radiusEarth * R_EARTH;
    const M = massEarth * M_EARTH;
    
    // g = GM / R^2
    return (G * M) / (R * R);
  }

  /**
   * Calculate escape velocity
   */
  calculateEscapeVelocity(radiusEarth: number, massEarth: number): number {
    if (radiusEarth <= 0 || massEarth <= 0) {
      return NaN;
    }
    
    const R = radiusEarth * R_EARTH;
    const M = massEarth * M_EARTH;
    
    // v_esc = sqrt(2GM / R)
    return Math.sqrt((2.0 * G * M) / R);
  }

  /**
   * Calculate density
   */
  calculateDensity(radiusEarth: number, massEarth: number): number {
    if (radiusEarth <= 0 || massEarth <= 0) {
      return NaN;
    }
    
    const R = radiusEarth * R_EARTH;
    const M = massEarth * M_EARTH;
    
    // ρ = M / V = M / (4/3 * π * R^3)
    const volume = (4.0 / 3.0) * Math.PI * R * R * R;
    return M / volume / 1000.0;  // Convert to g/cm^3
  }

  /**
   * Validate physical plausibility of parameters
   */
  validatePhysicalPlausibility(params: PhysicsCalculationInput): string[] {
    const warnings: string[] = [];
    
    // Check radius bounds (0.5 - 10 Earth radii for known exoplanets)
    if (params.radiusEarth !== undefined) {
      if (params.radiusEarth < 0.5) warnings.push("Planet radius very small (< 0.5 R⊕)");
      if (params.radiusEarth > 10) warnings.push("Planet radius very large (> 10 R⊕)");
    }
    
    // Check mass bounds (0.1 - 1000 Earth masses for known exoplanets)
    if (params.massEarth !== undefined) {
      if (params.massEarth < 0.1) warnings.push("Planet mass very small (< 0.1 M⊕)");
      if (params.massEarth > 1000) warnings.push("Planet mass very large (> 1000 M⊕)");
    }
    
    // Check density consistency
    if (params.radiusEarth !== undefined && params.massEarth !== undefined) {
      const density = this.calculateDensity(params.radiusEarth, params.massEarth);
      if (density < 0.3) warnings.push("Density unusually low (< 0.3 g/cm³ - unlikely)");
      if (density > 14) warnings.push("Density unusually high (> 14 g/cm³ - iron core planet)");
    }
    
    // Check orbital period
    if (params.orbitalPeriodDays !== undefined) {
      if (params.orbitalPeriodDays < 0.1) warnings.push("Orbital period very short (< 0.1 days)");
      if (params.orbitalPeriodDays > 10000) warnings.push("Orbital period very long (> 10000 days)");
    }
    
    // Check transit depth (should be < 1%)
    if (params.transitDepthPPM !== undefined) {
      if (params.transitDepthPPM > 10000) warnings.push("Transit depth unusually large (> 1%)");
    }
    
    return warnings;
  }

  /**
   * Comprehensive physics calculation
   */
  calculate(input: PhysicsCalculationInput): PhysicsCalculationResult {
    const warnings = this.validatePhysicalPlausibility(input);
    
    // Default star parameters (Sun-like)
    const starMass = input.starMassSolar ?? 1.0;
    const starRadius = input.starRadiusSolar ?? 1.0;
    const starTemp = input.starTempK ?? 5778;
    let starLuminosity = input.starLuminositySolar;
    
    // Calculate stellar luminosity if not provided
    if (starLuminosity === undefined) {
      starLuminosity = this.calculateStellarLuminosity(starRadius, starTemp);
    }
    
    // Calculate orbital parameters
    let orbitalPeriod = input.orbitalPeriodDays ?? 365;
    let semiMajorAxis = input.semiMajorAxisAU ?? 1.0;
    
    // If period is provided but not semi-major axis, calculate it
    if (input.orbitalPeriodDays !== undefined && input.semiMajorAxisAU === undefined) {
      semiMajorAxis = this.calculateSemiMajorAxis(input.orbitalPeriodDays, starMass);
    }
    
    // If semi-major axis is provided but not period, calculate it
    if (input.semiMajorAxisAU !== undefined && input.orbitalPeriodDays === undefined) {
      orbitalPeriod = this.calculateOrbitalPeriod(input.semiMajorAxisAU, starMass);
    }
    
    // Calculate equilibrium temperature
    const equilibriumTemp = this.calculateEquilibriumTemperature(
      starTemp,
      starRadius,
      semiMajorAxis
    );
    
    // Calculate habitable zone
    const hz = this.calculateHabitableZone(starLuminosity);
    const inHZ = semiMajorAxis >= hz.inner && semiMajorAxis <= hz.outer;
    
    // Calculate planet properties
    const radiusEarth = input.radiusEarth ?? 1.0;
    const massEarth = input.massEarth ?? this.estimateMassFromRadius(radiusEarth);
    
    const surfaceGravity = this.calculateSurfaceGravity(radiusEarth, massEarth);
    const escapeVelocity = this.calculateEscapeVelocity(radiusEarth, massEarth);
    const density = this.calculateDensity(radiusEarth, massEarth);
    
    const isPlausible = warnings.length === 0;
    
    return {
      orbitalPeriodDays: orbitalPeriod,
      semiMajorAxisAU: semiMajorAxis,
      equilibriumTemperatureK: equilibriumTemp,
      habitableZoneInnerAU: hz.inner,
      habitableZoneOuterAU: hz.outer,
      inHabitableZone: inHZ,
      surfaceGravityMS2: surfaceGravity,
      escapeVelocityMS: escapeVelocity,
      densityGCM3: density,
      starLuminositySolar: starLuminosity,
      starRadiusM: starRadius * R_SUN,
      isPhysicallyPlausible: isPlausible,
      warnings
    };
  }

  /**
   * Estimate mass from radius using mass-radius relationship
   * Based on empirical relationships for exoplanets
   */
  private estimateMassFromRadius(radiusEarth: number): number {
    // Mass-radius relationship varies by planet type
    if (radiusEarth < 1.5) {
      // Terrestrial planets: M ~ R^1.5 to R^2
      return Math.pow(radiusEarth, 1.8);
    } else if (radiusEarth < 4) {
      // Super-Earths/Mini-Neptunes
      return Math.pow(radiusEarth, 2.5);
    } else {
      // Neptune/Jupiter-like: M ~ R^3
      return Math.pow(radiusEarth, 3.5);
    }
  }
}

export const physicsCalculationService = new PhysicsCalculationService();
