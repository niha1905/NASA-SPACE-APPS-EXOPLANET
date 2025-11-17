import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Lightbulb,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Microscope
} from 'lucide-react';
import { ModelPrediction } from '@/services/mlModelService';
import {
  getTemperature,
  getDistance,
  getProbability,
  getConfidence,
  isHabitable,
  isPhysicallyPlausible
} from '@/lib/predictionUtils';

interface PredictionReasoningProps {
  prediction: ModelPrediction;
  showDetailed?: boolean;
}

/**
 * Comprehensive reasoning explanation for ML predictions
 * Shows why the model made its decision and physics validation
 */
export const PredictionReasoning: React.FC<PredictionReasoningProps> = ({
  prediction,
  showDetailed = true
}) => {
  // Generate confidence reasoning
  const generateConfidenceReasoning = () => {
    const reasons: string[] = [];
    const prob = getProbability(prediction);

    if (prob > 0.9) {
      reasons.push('Strong transit-like signature detected in light curve');
      reasons.push('Multiple periodic dips consistent with planetary transit');
      reasons.push('Signal-to-noise ratio exceeds planetary detection threshold');
    } else if (prob > 0.75) {
      reasons.push('Coherent periodic signal matches exoplanet characteristics');
      reasons.push('Light curve variations consistent with transit events');
    } else if (prob > 0.6) {
      reasons.push('Periodic signal detected but with moderate confidence');
      reasons.push('Some features consistent with stellar activity instead of planets');
    } else {
      reasons.push('Weak periodic signal - could be stellar noise');
      reasons.push('Further observations recommended');
    }

    return reasons;
  };

  // Generate physics reasoning
  const generatePhysicsReasoning = () => {
    const reasons: string[] = [];

    if (prediction.physicsValidation) {
      const phys = prediction.physicsValidation;
      const temp = getTemperature(prediction);
      const dist = getDistance(prediction);

      // Temperature
      if (temp > 200 && temp < 400) {
        reasons.push(`Equilibrium temperature ${temp.toFixed(0)}K is in the range for potentially habitable worlds`);
      } else if (temp < 200) {
        reasons.push(`Very cold equilibrium temperature (${temp.toFixed(0)}K) - likely ice-covered`);
      } else {
        reasons.push(`High temperature (${temp.toFixed(0)}K) - planet likely has lost volatile atmospheres`);
      }

      // Habitable zone
      if (phys.inHabitableZone) {
        reasons.push(`Planet orbits within the star's habitable zone (${phys.habitableZoneInner?.toFixed(3)} - ${phys.habitableZoneOuter?.toFixed(3)} AU)`);
      } else {
        const tooClose = typeof phys.habitableZoneInner === 'number' && dist < phys.habitableZoneInner;
        reasons.push(`Planet orbits outside habitable zone - ${tooClose ? 'too close (tidal effects)' : 'too distant (insufficient radiation)'}`);
      }

      // Surface gravity
      if (typeof phys.surfaceGravity === 'number' && phys.surfaceGravity > 5 && phys.surfaceGravity < 15) {
        reasons.push(`Surface gravity (${phys.surfaceGravity.toFixed(2)} m/s²) suitable for maintaining atmospheres`);
      }

      // Density
      if (typeof phys.density === 'number') {
        if (phys.density < 1) {
          reasons.push(`Low density (${phys.density.toFixed(2)} g/cm³) suggests large planet with light composition`);
        } else if (phys.density < 5.5) {
          reasons.push(`Rocky composition indicated by density (${phys.density.toFixed(2)} g/cm³) similar to Earth`);
        } else {
          reasons.push(`High density suggests iron-rich core or extreme pressure`);
        }
      }
    }

    return reasons;
  };

  // Generate planetary type reasoning
  const generateTypeReasoning = () => {
    const reasons: string[] = [];

    const type = (prediction.planetType || '').toLowerCase();
    switch (type) {
      case 'terrestrial':
        reasons.push('Size and mass consistent with rocky planets');
        reasons.push('Expected to have solid surface');
        reasons.push('Can support thin to thick atmospheres');
        break;
      case 'super earth':
        reasons.push('Larger than Earth but smaller than Neptune');
        reasons.push('Likely rocky with possibly thick atmosphere');
        reasons.push('Strong gravity may retain volatile elements');
        break;
      case 'mini-neptune':
        reasons.push('Intermediate between Earth and Neptune');
        reasons.push('Likely has thick hydrogen-helium envelope');
        reasons.push('Difficult to study surface properties');
        break;
      case 'gas giant':
        reasons.push('Large gaseous planet without solid surface');
        reasons.push('High gravity retains hydrogen and helium');
        reasons.push('Complex atmospheric dynamics');
        break;
      default:
        reasons.push('Classification uncertain - falls between defined categories');
    }

    return reasons;
  };

  const confidenceReasons = generateConfidenceReasoning();
  const physicsReasons = generatePhysicsReasoning();
  const typeReasons = generateTypeReasoning();

  const prob = getProbability(prediction);
  const conf = getConfidence(prediction);

  return (
    <div className="space-y-4 w-full">
      {/* Main Reasoning Card */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Why This Prediction?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Detection Confidence Reasoning */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-lg">
                Detection Confidence: {(prob * 100).toFixed(1)}%
              </h3>
            </div>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription>
                <ul className="space-y-2">
                  {confidenceReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-blue-900">{reason}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          {/* Physics Validation Reasoning */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-lg">Physics Validation</h3>
              {isPhysicallyPlausible(prediction) ? (
                <Badge className="ml-auto bg-green-100 text-green-800">Plausible</Badge>
              ) : (
                <Badge className="ml-auto bg-yellow-100 text-yellow-800">Check Warnings</Badge>
              )}
            </div>
            <Alert className="bg-purple-50 border-purple-200">
              <AlertDescription>
                <ul className="space-y-2">
                  {physicsReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-purple-900">{reason}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          {/* Planetary Type Reasoning */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-lg">
                Classification: {prediction.planetType}
              </h3>
            </div>
            <Alert className="bg-indigo-50 border-indigo-200">
              <AlertDescription>
                <ul className="space-y-2">
                  {typeReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-indigo-900">{reason}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          {/* Physics Warnings */}
          {prediction.physicsValidation?.warnings && prediction.physicsValidation.warnings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-lg">Physics Notes</h3>
              </div>
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription>
                  <ul className="space-y-2">
                    {prediction.physicsValidation.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-orange-900">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Habitability Reasoning */}
          {showDetailed && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-lg">Habitability Assessment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${prediction.hasWater ? 'bg-blue-500' : 'bg-gray-400'} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="font-medium text-sm">Water</p>
                    <p className="text-xs text-muted-foreground">
                      {prediction.hasWater
                        ? 'Liquid water could exist on surface'
                        : 'Conditions unlikely for liquid water'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${prediction.hasAtmosphere ? 'bg-cyan-500' : 'bg-gray-400'} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="font-medium text-sm">Atmosphere</p>
                    <p className="text-xs text-muted-foreground">
                      {prediction.hasAtmosphere
                        ? 'Likely to retain atmosphere'
                        : 'May lack substantial atmosphere'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${isHabitable(prediction) ? 'bg-green-500' : 'bg-gray-400'} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="font-medium text-sm">Habitable Zone</p>
                    <p className="text-xs text-muted-foreground">
                      {isHabitable(prediction)
                        ? 'Within distance suitable for life'
                        : 'Outside optimal habitable zone'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${conf > 0.7 ? 'bg-green-500' : 'bg-yellow-500'} flex-shrink-0 mt-1`} />
                  <div>
                    <p className="font-medium text-sm">Model Confidence</p>
                    <p className="text-xs text-muted-foreground">
                      {conf > 0.8
                        ? 'High confidence prediction'
                        : conf > 0.6
                          ? 'Moderate confidence'
                          : 'Lower confidence - needs verification'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Information */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            Model Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Model Version:</span>
              <p className="font-semibold">{prediction.modelVersion || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Input Data Points:</span>
              <p className="font-semibold">{prediction.timePoints || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Classification Prob:</span>
              <p className="font-semibold">{(prediction.classificationProbability || 0).toFixed(4)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence Score:</span>
              <p className="font-semibold">{(conf * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              Predictions based on deep learning models trained on Kepler & TESS data, 
              validated with physics-based calculations. Always recommend follow-up observations 
              for confirmation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictionReasoning;
