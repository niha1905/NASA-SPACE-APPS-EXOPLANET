import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  ThermometerSun, 
  Droplets, 
  Wind, 
  Shield,
  Heart,
  AlertCircle
} from 'lucide-react';
import { ModelPrediction } from '@/services/mlModelService';
import { getTemperature, getRadius, getDistance, getProbability, isHabitable } from '@/lib/predictionUtils';

interface PlanetExistenceVisualizerProps {
  prediction: ModelPrediction;
  showDetailed?: boolean;
}

/**
 * Component for visualizing planet existence probability and key characteristics
 */
export const PlanetExistenceVisualizer: React.FC<PlanetExistenceVisualizerProps> = ({ 
  prediction, 
  showDetailed = true 
}) => {
  // Calculate confidence score (0-100)
  const confidenceScore = Math.round(getProbability(prediction) * 100);
  
  // Determine existence confidence level
  const getConfidenceLevel = (prob: number) => {
    if (prob > 0.9) return { level: 'CONFIRMED', color: 'bg-green-500', text: 'text-green-700' };
    if (prob > 0.75) return { level: 'HIGHLY LIKELY', color: 'bg-blue-500', text: 'text-blue-700' };
    if (prob > 0.6) return { level: 'PROBABLE', color: 'bg-yellow-500', text: 'text-yellow-700' };
    if (prob > 0.4) return { level: 'CANDIDATE', color: 'bg-orange-500', text: 'text-orange-700' };
    return { level: 'UNCERTAIN', color: 'bg-red-500', text: 'text-red-700' };
  };
  
  const confidenceLevel = getConfidenceLevel(getProbability(prediction));

  // Calculate habitability score
  const habitabilityFactors = {
    temperature: getTemperature(prediction) > 200 && getTemperature(prediction) < 400 ? 1 : 0.5,
    distance: getDistance(prediction) > 0.5 && getDistance(prediction) < 2 ? 1 : 0.5,
    atmosphere: prediction.hasAtmosphere ? 1 : 0,
    water: prediction.hasWater ? 1 : 0,
    size: getRadius(prediction) > 0.8 && getRadius(prediction) < 2 ? 1 : 0.7,
  };
  
  const habitabilityScore = (
    (habitabilityFactors.temperature * 0.25 +
    habitabilityFactors.distance * 0.25 +
    habitabilityFactors.atmosphere * 0.15 +
    habitabilityFactors.water * 0.2 +
    habitabilityFactors.size * 0.15) * 100
  );

  // Determine planet type emoji/icon
  const getPlanetTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'super earth':
        return { emoji: '🌍', description: 'Larger than Earth but smaller than Neptune' };
      case 'terrestrial':
        return { emoji: '🌎', description: 'Rocky planet similar to Earth' };
      case 'mini-neptune':
        return { emoji: '🌀', description: 'Intermediate between Earth and Neptune' };
      case 'gas giant':
        return { emoji: '🪐', description: 'Large gaseous planet like Jupiter' };
      default:
        return { emoji: '⭐', description: 'Unknown planetary type' };
    }
  };

  const typeInfo = getPlanetTypeInfo(prediction.planetType);

  return (
    <div className="space-y-6 w-full">
      {/* Main Existence Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 hover:border-primary/50 transition-all">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <span className="text-5xl">{typeInfo.emoji}</span>
              <div>
                <div>Exoplanet Detected</div>
                <div className="text-sm font-normal text-muted-foreground">{typeInfo.description}</div>
              </div>
            </CardTitle>
            <Badge 
              className={`text-lg px-4 py-2 ${confidenceLevel.color} text-white rounded-full`}
            >
              {confidenceLevel.level}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Existence Probability Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">Detection Confidence</span>
              </div>
              <span className="text-3xl font-bold text-primary">{confidenceScore}%</span>
            </div>
            
            {/* Animated progress bar */}
            <div className="relative overflow-hidden rounded-full h-8 bg-background border border-primary/20">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-pulse rounded-full transition-all duration-1000"
                style={{ width: `${confidenceScore}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white drop-shadow-lg">{confidenceScore}%</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Model confidence based on light curve analysis and physics-enhanced deep learning
            </p>
          </div>

          {/* Physical Characteristics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Temperature */}
            <div className="bg-card/50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <ThermometerSun className="h-5 w-5 text-orange-500" />
                <span className="text-xs font-semibold text-muted-foreground">TEMP</span>
              </div>
                <div className="text-2xl font-bold text-orange-600">
                {Math.round(getTemperature(prediction))}K
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {getTemperature(prediction) < 273 ? 'Frozen' : getTemperature(prediction) < 373 ? 'Habitable' : 'Hot'}
              </div>
            </div>

            {/* Radius */}
            <div className="bg-card/50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-semibold text-muted-foreground">SIZE</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {getRadius(prediction).toFixed(2)}R⊕
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {getRadius(prediction) < 1.5 ? 'Rocky' : 'Large'}
              </div>
            </div>

            {/* Distance from Star */}
            <div className="bg-card/50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="h-5 w-5 text-yellow-500" />
                <span className="text-xs font-semibold text-muted-foreground">ORBIT</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {getDistance(prediction).toFixed(3)}AU
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {getDistance(prediction) < 0.1 ? 'Close' : getDistance(prediction) < 2 ? 'Moderate' : 'Distant'}
              </div>
            </div>

            {/* Habitability */}
            <div className="bg-card/50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-green-500" />
                <span className="text-xs font-semibold text-muted-foreground">HABIT</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(habitabilityScore)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isHabitable(prediction) ? 'Possible' : 'Unlikely'}
              </div>
            </div>
          </div>

          {/* Atmospheric & Surface Features */}
          {showDetailed && (
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${prediction.hasAtmosphere ? 'bg-blue-400' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Atmosphere</span>
                </div>
                <Progress 
                  value={prediction.hasAtmosphere ? 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {prediction.hasAtmosphere ? 'Likely Present' : 'Not Detected'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${prediction.hasWater ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Water</span>
                </div>
                <Progress 
                  value={prediction.hasWater ? 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {prediction.hasWater ? 'Possible' : 'Unlikely'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${prediction.isHabitable ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Habitable Zone</span>
                </div>
                <Progress 
                  value={prediction.isHabitable ? 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {prediction.isHabitable ? 'In Zone' : 'Outside Zone'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Physics Validation */}
      {prediction.physicsValidation && (
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Physics-Based Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Surface Gravity:</span>
                <p className="font-semibold">{prediction.physicsValidation.surfaceGravity.toFixed(2)} m/s²</p>
              </div>
              <div>
                <span className="text-muted-foreground">Density:</span>
                <p className="font-semibold">{prediction.physicsValidation.density.toFixed(2)} g/cm³</p>
              </div>
              <div>
                <span className="text-muted-foreground">Habitable Zone Inner:</span>
                <p className="font-semibold">{prediction.physicsValidation.habitableZoneInner.toFixed(3)} AU</p>
              </div>
              <div>
                <span className="text-muted-foreground">Habitable Zone Outer:</span>
                <p className="font-semibold">{prediction.physicsValidation.habitableZoneOuter.toFixed(3)} AU</p>
              </div>
            </div>

            {prediction.physicsValidation.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-yellow-600 mb-2">Physics Warnings:</p>
                <ul className="text-xs space-y-1">
                  {prediction.physicsValidation.warnings.map((w, i) => (
                    <li key={i} className="text-muted-foreground">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlanetExistenceVisualizer;
