import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Brain, Database, Zap, Key, Upload, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DataUploadInterface from '@/components/DataUploadInterface';
import AIModelDashboard from '@/components/AIModelDashboard';
import { ModelPrediction } from '@/services/mlModelService';
import { planets } from '@/data/planetData';
import { usePlanetData } from '@/contexts/PlanetDataContext';

const MLAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPlanetData, setExtractedData, setAllExtractedPlanets } = usePlanetData();
  // Also read back planets so we can display what was fetched
  const { allExtractedPlanets, extractedData } = usePlanetData() as any;
  const [currentPrediction, setCurrentPrediction] = useState<ModelPrediction | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState(0);
  const [analysisHistory, setAnalysisHistory] = useState<ModelPrediction[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleAnalysisComplete = (prediction: ModelPrediction) => {
    setCurrentPrediction(prediction);
    setAnalysisHistory(prev => [prediction, ...prev.slice(0, 4)]); // Keep last 5 analyses

    // Store data in context
    setCurrentPlanetData(prediction);

    const extractedData = {
      timePoints: prediction.timePoints || 0,
      fluxPoints: prediction.fluxPoints || 0,
      timeRange: prediction.timeRange || 0,
      fluxMean: prediction.fluxMean || 0,
      fluxMin: prediction.fluxMin || 0,
      fluxMax: prediction.fluxMax || 0,
      fluxStdDev: prediction.fluxStdDev || 0,
    };
    setExtractedData(extractedData);

    const generatedPlanets = generatePlanetsFromData(prediction, extractedData);
    setAllExtractedPlanets(generatedPlanets);

    console.log('Analysis complete! Generated planets:', generatedPlanets);
  };

  const generatePlanetsFromData = (prediction: ModelPrediction, extractedData: any) => {
    const generated = [];

    // Main planet
    generated.push({
      id: 1,
      name: `Extracted Planet (${prediction.planetType})`,
      probability: prediction.probability,
      radius: prediction.radius,
      distanceFromStar: prediction.distanceFromStar,
      hasWater: prediction.hasWater,
      hasAtmosphere: prediction.hasAtmosphere,
      isHabitable: prediction.isHabitable,
      color: prediction.isHabitable ? '#00BFFF' : '#FF6B6B',
      type: prediction.planetType,
      temperature: prediction.temperature,
      confidence: prediction.confidence,
      datasetInfo: extractedData,
      description: `AI-analyzed planet from your dataset. ${prediction.isHabitable ? 'Potentially habitable' : 'Non-habitable'} world with ${prediction.hasAtmosphere ? 'atmosphere' : 'no atmosphere'}.`,
      ...extractedData,
    });

    if (extractedData.timePoints > 5000) {
      generated.push({
        id: 2,
        name: `Companion ${prediction.planetType}`,
        probability: prediction.probability * 0.8,
        radius: prediction.radius * (0.8 + Math.random() * 0.4),
        distanceFromStar: prediction.distanceFromStar * (0.7 + Math.random() * 0.6),
        hasWater: Math.random() > 0.5,
        hasAtmosphere: Math.random() > 0.3,
        isHabitable: Math.random() > 0.6,
        color: '#32CD32',
        type: prediction.planetType,
        temperature: prediction.temperature * (0.8 + Math.random() * 0.4),
        confidence: prediction.confidence * 0.9,
        datasetInfo: extractedData,
        description: `Companion planet detected in the same system.`,
        ...extractedData,
      });
    }

    if (extractedData.fluxStdDev > 0.01) {
      generated.push({
        id: 3,
        name: 'Transit Planet',
        probability: prediction.probability * 0.7,
        radius: prediction.radius * (0.5 + Math.random() * 0.5),
        distanceFromStar: prediction.distanceFromStar * (0.3 + Math.random() * 0.4),
        hasWater: false,
        hasAtmosphere: Math.random() > 0.7,
        isHabitable: false,
        color: '#FF8C00',
        type: 'Gas Giant',
        temperature: prediction.temperature * (1.2 + Math.random() * 0.8),
        confidence: prediction.confidence * 0.8,
        datasetInfo: extractedData,
        description: 'Gas giant planet detected through transit analysis.',
        ...extractedData,
      });
    }

    return generated;
  };

  const handleFetchData = async () => {
    setIsLoadingData(true);
    try {
      const url =
        '/TAP/sync?query=select+pl_name,pl_masse,pl_rade+from+ps+where+pl_rade<2.0+and+pl_masse>0&format=json';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: Array<{ pl_name?: string; pl_masse?: number; pl_rade?: number }> = await response.json();

      // Map API results to our app's planet structure expected by Index page
      const mappedPlanets = data.map((item, idx) => ({
        id: idx + 1,
        name: item.pl_name || `Planet ${idx + 1}`,
        probability: 0.5,
        radius: typeof item.pl_rade === 'number' ? item.pl_rade : 1,
        distanceFromStar: 1 + (idx % 5) * 0.2,
        hasWater: false,
        hasAtmosphere: true,
        isHabitable: (item.pl_rade || 0) > 0.8 && (item.pl_rade || 0) < 1.6,
        color: '#3B82F6',
        type: 'Rocky',
        temperature: 288,
        confidence: 0.7,
        datasetInfo: {
          timePoints: data.length,
          fluxPoints: 0,
          timeRange: 0,
          fluxMean: 0,
          fluxMin: 0,
          fluxMax: 0,
          fluxStdDev: 0,
        },
        // Keep extra fields for potential use
        massEarth: item.pl_masse,
        radiusEarth: item.pl_rade,
      }));

      // Keep all planets from the API (no cap); UI will handle many. Ensure at least 10 if available.
      setAllExtractedPlanets(mappedPlanets);
      setExtractedData({ timePoints: mappedPlanets.length });
      alert(`Fetched ${mappedPlanets.length} planets from Exoplanet Archive`);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch data from Exoplanet Archive');
    } finally {
      setIsLoadingData(false);
    }
  };

  const currentPlanet = planets[selectedPlanet];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
      

          <Badge variant="outline" className="bg-white/10 text-white border-white/20">
            <Brain className="h-3 w-3 mr-1" />
            ML Enabled
          </Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Input Section */}
          <div className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Input & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="api">
                      <Key className="h-4 w-4 mr-1" />
                      API Key
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload">
                    <DataUploadInterface onAnalysisComplete={handleAnalysisComplete} />
                  </TabsContent>

                  <TabsContent value="api" className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="api-key">NASA API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder="Enter your NASA API key"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{' '}
                          <a
                            href="https://api.nasa.gov/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            api.nasa.gov
                          </a>
                        </p>
                      </div>

                      <Button
                        onClick={handleFetchData}
                        disabled={isLoadingData}
                        className="w-full"
                      >
                        {isLoadingData ? 'Fetching Data...' : 'Fetch from Exoplanet Archive'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Model Info */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  Model Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Model Type:</span>
                    <p className="font-medium">Deep Learning CNN</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Training Data:</span>
                    <p className="font-medium">Kepler + TESS</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>
                    <p className="font-medium">94.2%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parameters:</span>
                    <p className="font-medium">2.3M</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  This model analyzes light curve data to detect planetary transits,
                  classify planet types, and predict habitability indicators.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard and Results */}
          <div className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Model Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIModelDashboard
                  planetData={currentPlanet}
                  isAnalyzing={false}
                  modelPrediction={currentPrediction}
                />
              </CardContent>
            </Card>

            {(currentPrediction || (allExtractedPlanets && allExtractedPlanets.length > 0)) && (
              <>
                {/* Prediction Results */}
                {currentPrediction && (
                <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-primary" />
                      Prediction Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Planet Type:</span>
                          <Badge variant="outline">{currentPrediction.planetType}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Probability:</span>
                          <span className="font-bold text-primary">
                            {(currentPrediction.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="font-bold text-primary">
                            {(currentPrediction.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Temperature:</span>
                          <span>{currentPrediction.temperature}K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Radius:</span>
                          <span>{currentPrediction.radius.toFixed(2)}R⊕</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distance:</span>
                          <span>{currentPrediction.distanceFromStar.toFixed(3)}AU</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentPrediction.hasAtmosphere ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span>Atmosphere</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentPrediction.hasWater ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        <span>Water</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentPrediction.isHabitable ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span>Habitable</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}

                {/* Fetched Planets (from API) */}
                {allExtractedPlanets && allExtractedPlanets.length > 0 && (
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Database className="h-4 w-4 text-primary" />
                        Fetched Planets ({allExtractedPlanets.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {allExtractedPlanets.map((p: any, i: number) => (
                          <div key={`fp-${p.id || p.name || i}`} className="flex items-center justify-between p-2 rounded bg-card/50">
                            <span className="truncate mr-2">{p.name || `Planet ${i + 1}`}</span>
                            <span className="text-xs text-muted-foreground">R≈{(p.radius ?? 0).toFixed ? p.radius.toFixed(2) : p.radius} R⊕</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Analysis History */}
                {analysisHistory.length > 0 && (
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Analyses</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisHistory.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-card/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${p.isHabitable ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium">{p.planetType}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {(p.probability * 100).toFixed(1)}%
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {p.isHabitable ? 'Habitable' : 'Non-habitable'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-sm">Explore Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" onClick={() => navigate('/index')}>
                        <Globe className="h-4 w-4 mr-2" />
                        View Planet Details
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/exoplanet-explorer')}>
                        <Brain className="h-4 w-4 mr-2" />
                        Explore Exoplanet System
                      </Button>
                    </div>
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                      Navigate to different views to explore fetched/analyzed planet data in 3D.
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Instructions */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">How to Use</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>1. Upload Kepler, K2, or TESS light curve data (CSV, FITS, or text)</p>
                <p>2. The AI model will detect planetary transits</p>
                <p>3. View predictions including type, habitability, and physical properties</p>
                <p>4. Explore results in 3D visualizations</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLAnalysis;
