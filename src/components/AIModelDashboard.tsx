import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { PlanetData } from "@/data/planetData";
import { mlModelService, ModelPrediction } from "@/services/mlModelService";

interface AIModelDashboardProps {
  planetData: PlanetData;
  isAnalyzing?: boolean;
  modelPrediction?: ModelPrediction;
}

const AIModelDashboard = ({ planetData, isAnalyzing = false, modelPrediction }: AIModelDashboardProps) => {
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [modelConfidence, setModelConfidence] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    // Check if model is loaded
    setModelLoaded(mlModelService.isLoaded());
  }, []);

  useEffect(() => {
    if (modelPrediction) {
      // Use real model prediction
      setModelConfidence(modelPrediction.confidence * 100);
      setAnalysisProgress(100);
    } else if (isAnalyzing) {
      // Simulate AI model analysis
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setModelConfidence(planetData.probability * 100);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setModelConfidence(planetData.probability * 100);
      setAnalysisProgress(100);
    }
  }, [planetData.probability, isAnalyzing, modelPrediction]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-500";
    if (confidence >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return { variant: "default" as const, text: "High Confidence", icon: CheckCircle };
    if (confidence >= 70) return { variant: "secondary" as const, text: "Medium Confidence", icon: AlertTriangle };
    return { variant: "destructive" as const, text: "Low Confidence", icon: AlertTriangle };
  };

  const confidenceBadge = getConfidenceBadge(modelConfidence);

  return (
    <div className="space-y-4">
      {/* AI Model Status */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-primary" />
            AI Model Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Model Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Model Status:</span>
            <Badge variant={modelLoaded ? "default" : "secondary"} className="text-xs">
              {modelLoaded ? "Loaded" : "Loading..."}
            </Badge>
          </div>
          
          {isAnalyzing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing Kepler/TESS Data...</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Running deep learning classification models...
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model Confidence</span>
                <Badge variant={confidenceBadge.variant} className="text-xs">
                  <confidenceBadge.icon className="h-3 w-3 mr-1" />
                  {confidenceBadge.text}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Prediction Accuracy</span>
                  <span className={`font-bold ${getConfidenceColor(modelConfidence)}`}>
                    {modelConfidence.toFixed(1)}%
                  </span>
                </div>
                <Progress value={modelConfidence} className="h-2" />
                {modelPrediction && (
                  <div className="text-xs text-muted-foreground">
                    Based on {modelPrediction.planetType} classification
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Features */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-primary" />
            Detection Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${modelPrediction ? (modelPrediction.hasAtmosphere ? 'bg-green-500' : 'bg-gray-400') : (planetData.hasAtmosphere ? 'bg-green-500' : 'bg-gray-400')}`} />
              <span>Atmosphere</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${modelPrediction ? (modelPrediction.hasWater ? 'bg-blue-500' : 'bg-gray-400') : (planetData.hasWater ? 'bg-blue-500' : 'bg-gray-400')}`} />
              <span>Water Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${modelPrediction ? (modelPrediction.isHabitable ? 'bg-green-500' : 'bg-gray-400') : (planetData.isHabitable ? 'bg-green-500' : 'bg-gray-400')}`} />
              <span>Habitable Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>{modelPrediction ? 'ML Analysis' : 'Kepler Data'}</span>
            </div>
          </div>
          {modelPrediction && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Temperature:</span>
                  <span>{modelPrediction.temperature}K</span>
                </div>
                <div className="flex justify-between">
                  <span>Radius:</span>
                  <span>{modelPrediction.radius.toFixed(2)}R⊕</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span>{modelPrediction.distanceFromStar.toFixed(3)}AU</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Predictions */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            AI Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Planetary Type</span>
              <Badge variant="outline" className="text-xs">
                {modelPrediction ? modelPrediction.planetType : planetData.type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Temperature</span>
              <span className="text-muted-foreground">
                {modelPrediction ? `${modelPrediction.temperature}K` : `${planetData.temperature}K`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Radius</span>
              <span className="text-muted-foreground">
                {modelPrediction ? `${modelPrediction.radius.toFixed(2)}R⊕` : `${planetData.radius}R⊕`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Distance</span>
              <span className="text-muted-foreground">
                {modelPrediction ? `${modelPrediction.distanceFromStar.toFixed(3)}AU` : `${planetData.distanceFromStar}AU`}
              </span>
            </div>
            {modelPrediction && (
              <>
                <div className="flex justify-between">
                  <span>Probability</span>
                  <span className="text-primary font-bold">
                    {(modelPrediction.probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence</span>
                  <span className="text-primary font-bold">
                    {(modelPrediction.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIModelDashboard;
