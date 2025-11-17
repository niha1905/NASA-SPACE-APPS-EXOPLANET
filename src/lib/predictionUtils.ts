export interface PredictionLike {
  probability?: number;
  confidence?: number;
  temperature?: number;
  radius?: number;
  distanceFromStar?: number;
  physicsValidation?: {
    equilibriumTemp?: number;
    semiMajorAxisAU?: number;
    surfaceGravity?: number;
    escapeVelocity?: number;
    escapVelocity?: number; // tolerate variant
    density?: number;
    habitableZoneInner?: number;
    habitableZoneOuter?: number;
    inHabitableZone?: boolean;
    isPhysicallyPlausible?: boolean;
    warnings?: string[];
  } | null;
  modelVersion?: string;
}

export function getProbability(p: PredictionLike): number {
  return typeof p.probability === 'number' ? p.probability : (typeof p.confidence === 'number' ? p.confidence : 0);
}

export function getConfidence(p: PredictionLike): number {
  return typeof p.confidence === 'number' ? p.confidence : (typeof p.probability === 'number' ? p.probability : 0);
}

export function getTemperature(p: PredictionLike): number {
  if (p.physicsValidation && typeof p.physicsValidation.equilibriumTemp === 'number') return p.physicsValidation.equilibriumTemp;
  return typeof p.temperature === 'number' ? p.temperature : 0;
}

export function getRadius(p: PredictionLike): number {
  return typeof p.radius === 'number' ? p.radius : 0;
}

export function getDistance(p: PredictionLike): number {
  if (p.physicsValidation && typeof p.physicsValidation.semiMajorAxisAU === 'number') return p.physicsValidation.semiMajorAxisAU;
  if (p.physicsValidation && typeof p.physicsValidation.habitableZoneInner === 'number' && typeof p.physicsValidation.habitableZoneOuter === 'number') {
    // If distance not provided, estimate as midpoint of HZ
    return (p.physicsValidation.habitableZoneInner + p.physicsValidation.habitableZoneOuter) / 2;
  }
  return typeof p.distanceFromStar === 'number' ? p.distanceFromStar : 0;
}

export function isHabitable(p: PredictionLike): boolean {
  if (p.physicsValidation && typeof p.physicsValidation.inHabitableZone === 'boolean') return p.physicsValidation.inHabitableZone;
  return false;
}

export function isPhysicallyPlausible(p: PredictionLike): boolean {
  if (!p.physicsValidation) return false;
  if (typeof p.physicsValidation.isPhysicallyPlausible === 'boolean') return p.physicsValidation.isPhysicallyPlausible;
  // Fallback heuristic: plausible if there are no warnings and key physics values exist
  const phys = p.physicsValidation;
  const hasKey = typeof phys.equilibriumTemp === 'number' && (typeof phys.surfaceGravity === 'number' || typeof phys.density === 'number');
  const noWarnings = !phys.warnings || phys.warnings.length === 0;
  return hasKey && noWarnings;
}

export default {
  getProbability,
  getConfidence,
  getTemperature,
  getRadius,
  getDistance,
  isHabitable,
  isPhysicallyPlausible
};
