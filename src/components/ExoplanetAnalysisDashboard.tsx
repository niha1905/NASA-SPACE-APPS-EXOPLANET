import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Globe, 
  Microscope, 
  Zap, 
  BarChart3,
  Eye
} from 'lucide-react';
import { ModelPrediction } from '@/services/mlModelService';
import PlanetExistenceVisualizer from './PlanetExistenceVisualizer';
import SolarSystemVisualizer from './SolarSystemVisualizer';
import PredictionReasoning from './PredictionReasoning';

interface ExoplanetAnalysisDashboardProps {
  prediction: ModelPrediction;
  planetName?: string;
  starName?: string;
}

/**
 * Comprehensive exoplanet analysis dashboard
 * Combines visualizations, physics calculations, and reasoning
 */
export const ExoplanetAnalysisDashboard: React.FC<ExoplanetAnalysisDashboardProps> = ({
  prediction,
  planetName = 'Exoplanet',
  starName = 'Star'
}) => {
  const [selectedTab, setSelectedTab] = useState('existence');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent">
          Exoplanet Analysis Dashboard
        </h1>
        <p className="text-muted-foreground">
          AI-powered planetary detection with physics-based validation
        </p>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="existence" className="flex items-center gap-1 sm:gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Detection</span>
          </TabsTrigger>
          <TabsTrigger value="orbital" className="flex items-center gap-1 sm:gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="reasoning" className="flex items-center gap-1 sm:gap-2">
            <Microscope className="h-4 w-4" />
            <span className="hidden sm:inline">Why</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1 sm:gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Planet Existence & Characteristics */}
        <TabsContent value="existence" className="space-y-6">
          <PlanetExistenceVisualizer prediction={prediction} showDetailed={true} />
        </TabsContent>

        {/* Tab 2: Orbital System Visualization */}
        <TabsContent value="orbital" className="space-y-6">
          <SolarSystemVisualizer 
            prediction={prediction}
            planetName={planetName}
            starName={starName}
            width={700}
            height={450}
            interactive={true}
          />
          
          {/* Orbital Details */}
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 p-6">
            <h3 className="text-lg font-semibold mb-4">Orbital Mechanics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Semi-major Axis</p>
                <p className="text-2xl font-bold text-blue-500">{prediction.distanceFromStar.toFixed(3)}</p>
                <p className="text-xs">AU</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Orbital Period (Est.)</p>
                <p className="text-2xl font-bold text-cyan-500">
                  {Math.pow(prediction.distanceFromStar, 1.5).toFixed(1)}
                </p>
                <p className="text-xs">days</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Orbital Velocity (Est.)</p>
                <p className="text-2xl font-bold text-green-500">
                  {(29.8 / Math.sqrt(prediction.distanceFromStar)).toFixed(1)}
                </p>
                <p className="text-xs">km/s</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Equilibrium Temp</p>
                <p className="text-2xl font-bold text-orange-500">
                  {prediction.physicsValidation?.equilibriumTemp?.toFixed(0) || prediction.temperature}
                </p>
                <p className="text-xs">K</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Prediction Reasoning */}
        <TabsContent value="reasoning" className="space-y-6">
          <PredictionReasoning prediction={prediction} showDetailed={true} />
        </TabsContent>

        {/* Tab 4: Comparison with Known Exoplanets */}
        <TabsContent value="comparison" className="space-y-6">
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 p-6">
            <h3 className="text-lg font-semibold mb-4">Comparison to Earth & Known Exoplanets</h3>
            
            <div className="space-y-6">
              {/* Size Comparison */}
              <div className="space-y-3">
                <p className="font-semibold text-sm">Size Comparison</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-2">Earth</div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 mx-auto" />
                  </div>
                  <div className="text-xs text-muted-foreground">1.0 R⊕</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-2">{prediction.planetType}</div>
                    <div 
                      className="rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 mx-auto"
                      style={{
                        width: `${Math.min(60, prediction.radius * 8)}px`,
                        height: `${Math.min(60, prediction.radius * 8)}px`
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{prediction.radius.toFixed(2)} R⊕</div>
                </div>
              </div>

              {/* Temperature Comparison */}
              <div className="space-y-3">
                <p className="font-semibold text-sm">Temperature Comparison</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Venus</p>
                    <p className="text-lg font-bold text-blue-600">734K</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Earth</p>
                    <p className="text-lg font-bold text-green-600">288K</p>
                  </div>
                  <div className="bg-gradient-to-b from-orange-100 to-red-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">This Planet</p>
                    <p className="text-lg font-bold text-orange-600">{prediction.temperature.toFixed(0)}K</p>
                  </div>
                </div>
              </div>

              {/* Habitable Zone Position */}
              <div className="space-y-3">
                <p className="font-semibold text-sm">Position in Habitable Zone</p>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Too Hot</span>
                    <span>Habitable</span>
                    <span>Too Cold</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-gradient-to-r from-red-400 via-green-500 to-blue-400 relative">
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-yellow-300 rounded-full"
                      style={{
                        left: `${Math.min(100, Math.max(0, (prediction.distanceFromStar / 2) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Known Similar Planets */}
              <div className="space-y-3">
                <p className="font-semibold text-sm">Similar Known Exoplanets</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <p className="font-semibold text-sm">Proxima Centauri b</p>
                    <p className="text-xs text-muted-foreground">1.27 R⊕ | 234K</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">In HZ</p>
                  </div>
                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <p className="font-semibold text-sm">TRAPPIST-1e</p>
                    <p className="text-xs text-muted-foreground">0.93 R⊕ | 246K</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">In HZ</p>
                  </div>
                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <p className="font-semibold text-sm">Kepler-452b</p>
                    <p className="text-xs text-muted-foreground">1.6 R⊕ | 265K</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">In HZ</p>
                  </div>
                  <div className="bg-card/50 rounded-lg p-3 border border-border">
                    <p className="font-semibold text-sm">TOI-700d</p>
                    <p className="text-xs text-muted-foreground">2.3 R⊕ | 254K</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">In HZ</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-primary/20 p-6">
        <div className="space-y-3">
          <p className="font-semibold">Analysis Summary</p>
          <p className="text-sm text-muted-foreground">
            {prediction.probability > 0.8
              ? '✓ This is a strong exoplanet candidate with high confidence. Recommend prioritizing for follow-up observations.'
              : prediction.probability > 0.6
                ? '~ This is a probable exoplanet. Recommend further analysis and validation observations.'
                : '○ This is a candidate that requires more data. Additional follow-up observations are needed for confirmation.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Data based on: {prediction.modelVersion} model | 
            Processed: {prediction.timePoints} observations | 
            Confidence: {(prediction.confidence * 100).toFixed(1)}%
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ExoplanetAnalysisDashboard;
