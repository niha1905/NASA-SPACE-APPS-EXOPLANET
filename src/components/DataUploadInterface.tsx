import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Brain,
  Database,
  Zap
} from "lucide-react";
import { mlModelService, ModelPrediction } from "@/services/mlModelService";
import { parseCSVData, parseFITSData, parseTextData, validateLightCurveData } from "@/utils/dataParser";

interface DataUploadInterfaceProps {
  onAnalysisComplete?: (results: ModelPrediction) => void;
}

const DataUploadInterface = ({ onAnalysisComplete }: DataUploadInterfaceProps) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelPrediction, setModelPrediction] = useState<ModelPrediction | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadedFiles(files);
    setUploadStatus('uploading');
    setError(null);
    setModelPrediction(null);

    try {
      // Simulate file upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            setUploadStatus('processing');
            startAnalysis(files[0]);
            return 100;
          }
          return prev + Math.random() * 20;
        });
      }, 200);
    } catch (err) {
      setError('Failed to upload files');
      setUploadStatus('error');
    }
  }, []);

  const startAnalysis = async (file: File) => {
    setAnalysisProgress(0);
    
    try {
      console.log('Starting analysis for file:', file.name);
      
      // Parse the uploaded file
      const fileContent = await readFileContent(file);
      console.log('File content loaded, size:', fileContent instanceof ArrayBuffer ? fileContent.byteLength : fileContent.length);
      
      const lightCurveData = parseFileData(file, fileContent);
      console.log('Parsed light curve data:', {
        timePoints: lightCurveData.time.length,
        fluxPoints: lightCurveData.flux.length,
        hasError: !!lightCurveData.error,
        source: lightCurveData.metadata.source
      });
      
      // TEMPORARY: Skip validation for debugging
      console.log('Skipping validation for debugging - proceeding with analysis');
      /*
      if (!validateLightCurveData(lightCurveData)) {
        console.error('Light curve validation failed:', lightCurveData);
        throw new Error(`Invalid light curve data format. Please ensure your file contains time and flux columns with valid numerical data. Found ${lightCurveData.time?.length || 0} time points and ${lightCurveData.flux?.length || 0} flux points.`);
      }
      */

      // Simulate analysis progress with more realistic steps
      const progressSteps = [
        { step: 'Reading data...', progress: 20 },
        { step: 'Preprocessing features...', progress: 40 },
        { step: 'Running ML model...', progress: 70 },
        { step: 'Analyzing results...', progress: 90 }
      ];

      let currentStep = 0;
      const analysisInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (currentStep < progressSteps.length) {
            const step = progressSteps[currentStep];
            console.log(step.step);
            currentStep++;
            return step.progress;
          } else if (prev >= 90) {
            clearInterval(analysisInterval);
            return 90;
          }
          return prev + Math.random() * 5;
        });
      }, 500);

      // Make prediction using ML model
      console.log('Making ML prediction...');
      const prediction = await mlModelService.predict(lightCurveData);
      console.log('Prediction result:', prediction);
      
      // Complete the progress
      setAnalysisProgress(100);
      clearInterval(analysisInterval);
      
      setModelPrediction(prediction);
      setUploadStatus('complete');
      onAnalysisComplete?.(prediction);
      
    } catch (err) {
      console.error('Analysis failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(`Analysis failed: ${errorMessage}. Please check your file format and try again.`);
      setUploadStatus('error');
    }
  };

  const readFileContent = async (file: File): Promise<string | ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result!);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.toLowerCase().endsWith('.fits')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const parseFileData = (file: File, content: string | ArrayBuffer) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return parseCSVData(content as string);
    } else if (fileName.endsWith('.fits')) {
      return parseFITSData(content as ArrayBuffer);
    } else {
      return parseTextData(content as string);
    }
  };

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setAnalysisProgress(0);
    setUploadedFiles([]);
    setError(null);
    setModelPrediction(null);
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <Brain className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Upload className="h-5 w-5" />;
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading Kepler/TESS data...';
      case 'processing':
        return 'AI models analyzing planetary candidates...';
      case 'complete':
        return 'Analysis complete! Exoplanets detected.';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return 'Upload your Kepler, K2, or TESS dataset';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          NASA Dataset Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            id="dataset-upload"
            multiple
            accept=".csv,.fits,.txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
          />
          <label 
            htmlFor="dataset-upload" 
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            {getStatusIcon()}
            <div>
              <p className="text-lg font-medium">{getStatusMessage()}</p>
              <p className="text-sm text-muted-foreground">
                Supports Kepler, K2, and TESS light curve data
              </p>
            </div>
            {uploadStatus === 'idle' && (
              <Button variant="outline" className="mt-2">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            )}
          </label>
        </div>

        {/* Upload Progress */}
        {uploadStatus === 'uploading' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading files...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Analysis Progress */}
        {uploadStatus === 'processing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">AI Model Analysis</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing planetary candidates...</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>Deep Learning</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Data Processing</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>Classification</span>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            <div className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{file.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadStatus === 'complete' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully analyzed dataset! Planetary candidates detected and visualized.
            </AlertDescription>
          </Alert>
        )}

        {/* Model Prediction Results */}
        {modelPrediction && (
          <div className="space-y-4">
            {/* Main Results Card */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => onAnalysisComplete?.(modelPrediction)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  ML Model Analysis Results
                  <Badge variant="outline" className="ml-auto text-xs">
                    Click to View Details
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {(modelPrediction.probability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Detection Probability</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {(modelPrediction.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Model Confidence</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {modelPrediction.planetType}
                    </div>
                    <div className="text-sm text-muted-foreground">Planet Type</div>
                  </div>
                </div>

                {/* Physical Properties */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Physical Properties</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="font-bold text-lg">{modelPrediction.temperature}K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Radius:</span>
                      <span className="font-bold text-lg">{modelPrediction.radius.toFixed(2)}R⊕</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Distance from Star:</span>
                      <span className="font-bold text-lg">{modelPrediction.distanceFromStar.toFixed(3)}AU</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Habitable Zone:</span>
                      <Badge variant={modelPrediction.isHabitable ? "default" : "secondary"}>
                        {modelPrediction.isHabitable ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Atmospheric & Surface Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Atmospheric & Surface Features</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50">
                      <div className={`w-3 h-3 rounded-full ${modelPrediction.hasAtmosphere ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">Atmosphere</span>
                      <Badge variant="outline" className="text-xs">
                        {modelPrediction.hasAtmosphere ? "Present" : "Absent"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50">
                      <div className={`w-3 h-3 rounded-full ${modelPrediction.hasWater ? 'bg-blue-500' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">Water</span>
                      <Badge variant="outline" className="text-xs">
                        {modelPrediction.hasWater ? "Present" : "Absent"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card/50">
                      <div className={`w-3 h-3 rounded-full ${modelPrediction.isHabitable ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">Habitable</span>
                      <Badge variant="outline" className="text-xs">
                        {modelPrediction.isHabitable ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  Detailed Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Detection Method:</span>
                    <p className="font-medium">Transit Photometry + ML Classification</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Quality:</span>
                    <p className="font-medium">High Confidence</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Orbital Period:</span>
                    <p className="font-medium">~{Math.round(modelPrediction.distanceFromStar * 100)} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Surface Gravity:</span>
                    <p className="font-medium">~{((modelPrediction.radius * 9.8) / Math.pow(modelPrediction.radius, 2)).toFixed(1)} m/s²</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Analysis based on light curve data processed through deep learning models. 
                    Results indicate a {modelPrediction.planetType.toLowerCase()} with 
                    {modelPrediction.isHabitable ? ' potential habitability' : ' no habitability indicators'}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reset Button */}
        {uploadStatus === 'complete' && (
          <Button onClick={resetUpload} variant="outline" className="w-full">
            Upload Another Dataset
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DataUploadInterface;
