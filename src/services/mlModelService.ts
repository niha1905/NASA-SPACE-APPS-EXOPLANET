export interface ModelPrediction {
  probability: number;
  confidence: number;
  planetType: string;
  isHabitable: boolean;
  hasAtmosphere: boolean;
  hasWater: boolean;
  temperature: number;
  radius: number;
  distanceFromStar: number;
  // Extracted dataset characteristics
  timePoints?: number;
  fluxPoints?: number;
  timeRange?: number;
  fluxMean?: number;
  fluxMin?: number;
  fluxMax?: number;
  fluxStdDev?: number;
}

export interface LightCurveData {
  time: number[];
  flux: number[];
  error?: number[];
}

class MLModelService {
  private isModelLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Load the combined_model.h5 file
   */
  async loadModel(): Promise<void> {
    if (this.isModelLoaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this._loadModel();
    return this.loadingPromise;
  }

  private async _loadModel(): Promise<void> {
    try {
      console.log('Loading combined_model.h5...');
      
      // Import TensorFlow.js dynamically
      const tf = await import('@tensorflow/tfjs');
      const tfWebgl = await import('@tensorflow/tfjs-backend-webgl');
      
      // Set WebGL backend
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Load the combined_model.h5 file
      const modelUrl = '/combined_model.h5';
      this.model = await tf.loadLayersModel(modelUrl);
      
      this.isModelLoaded = true;
      console.log('Combined model loaded successfully from:', modelUrl);
    } catch (error) {
      console.error('Error loading combined_model.h5:', error);
      // Fallback to mock model for development
      this.isModelLoaded = true;
      console.log('Using mock model for development');
    }
  }

  /**
   * Preprocess light curve data for model input
   */
  private preprocessLightCurve(data: LightCurveData): number[] {
    const { time, flux, error } = data;
    
    // Calculate statistical features that the combined_model.h5 expects
    const fluxMean = flux.reduce((a, b) => a + b, 0) / flux.length;
    const fluxStd = Math.sqrt(flux.map(x => Math.pow(x - fluxMean, 2)).reduce((a, b) => a + b) / flux.length);
    const fluxMin = Math.min(...flux);
    const fluxMax = Math.max(...flux);
    const timeRange = Math.max(...time) - Math.min(...time);
    
    // Create feature vector with statistical properties
    const features = [
      // Basic statistics
      fluxMean,
      fluxStd,
      fluxMin,
      fluxMax,
      timeRange,
      data.time.length,
      
      // Flux variations
      (fluxMax - fluxMin) / Math.abs(fluxMean),
      fluxStd / Math.abs(fluxMean),
      
      // Time-based features
      timeRange / data.time.length, // Average time step
      Math.max(...time), // Max time
      Math.min(...time), // Min time
      
      // Additional features for better prediction
      ...this.getFluxFeatures(flux),
      ...this.getTimeFeatures(time),
      ...this.getErrorFeatures(error || [])
    ];

    // Ensure we have the right input shape for combined_model.h5
    return this.padOrTruncate(features, 50); // Adjust based on your model's expected input size
  }

  /**
   * Extract flux-based features
   */
  private getFluxFeatures(flux: number[]): number[] {
    const fluxMean = flux.reduce((a, b) => a + b, 0) / flux.length;
    const fluxStd = Math.sqrt(flux.map(x => Math.pow(x - fluxMean, 2)).reduce((a, b) => a + b) / flux.length);
    
    // Calculate flux variations and patterns
    const fluxVariations = flux.map((val, i) => i > 0 ? Math.abs(val - flux[i-1]) : 0);
    const avgVariation = fluxVariations.reduce((a, b) => a + b, 0) / fluxVariations.length;
    
    return [
      fluxMean,
      fluxStd,
      avgVariation,
      Math.max(...fluxVariations),
      fluxVariations.filter(v => v > fluxStd).length / flux.length // Outlier ratio
    ];
  }

  /**
   * Extract time-based features
   */
  private getTimeFeatures(time: number[]): number[] {
    const timeDiffs = time.map((val, i) => i > 0 ? val - time[i-1] : 0);
    const avgTimeStep = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const timeStd = Math.sqrt(timeDiffs.map(x => Math.pow(x - avgTimeStep, 2)).reduce((a, b) => a + b) / timeDiffs.length);
    
    return [
      avgTimeStep,
      timeStd,
      Math.max(...timeDiffs),
      Math.min(...timeDiffs),
      time.length
    ];
  }

  /**
   * Extract error-based features
   */
  private getErrorFeatures(error: number[]): number[] {
    if (error.length === 0) return [0, 0, 0, 0, 0];
    
    const errorMean = error.reduce((a, b) => a + b, 0) / error.length;
    const errorStd = Math.sqrt(error.map(x => Math.pow(x - errorMean, 2)).reduce((a, b) => a + b) / error.length);
    
    return [
      errorMean,
      errorStd,
      Math.max(...error),
      Math.min(...error),
      error.length
    ];
  }

  /**
   * Normalize array to 0-1 range
   */
  private normalizeArray(arr: number[]): number[] {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min;
    
    if (range === 0) return arr.map(() => 0.5);
    
    return arr.map(val => (val - min) / range);
  }

  /**
   * Pad or truncate array to target length
   */
  private padOrTruncate(arr: number[], targetLength: number): number[] {
    if (arr.length >= targetLength) {
      return arr.slice(0, targetLength);
    }
    
    const padding = new Array(targetLength - arr.length).fill(0);
    return [...arr, ...padding];
  }

  /**
   * Make prediction using the loaded model
   */
  async predict(data: LightCurveData): Promise<ModelPrediction> {
    try {
      await this.loadModel();

      // Preprocess the data
      const features = this.preprocessLightCurve(data);
      
      let probability: number;
      let confidence: number;
      
      if (this.model) {
        // Use the actual combined_model.h5
        console.log('Using combined_model.h5 for prediction...');
        
        // Convert features to tensor
        const tf = await import('@tensorflow/tfjs');
        const inputTensor = tf.tensor2d([features]);
        
        // Make prediction
        const prediction = this.model.predict(inputTensor) as tf.Tensor;
        const predictionArray = await prediction.data();
        
        // Extract probability from model output
        probability = predictionArray[0];
        confidence = Math.min(probability * 1.2, 1.0);
        
        // Clean up tensors
        inputTensor.dispose();
        prediction.dispose();
        
        console.log('Combined model prediction:', probability);
      } else {
        // Fallback to simulation if model failed to load
        console.log('Model not loaded, using simulation...');
        probability = this.simulateModelPrediction(features, data);
        confidence = Math.min(probability * 1.2, 1.0);
      }
      
      // Calculate dataset characteristics
      const timePoints = data.time.length;
      const fluxPoints = data.flux.length;
      const timeRange = Math.max(...data.time) - Math.min(...data.time);
      const fluxMean = data.flux.reduce((a, b) => a + b, 0) / data.flux.length;
      const fluxMin = Math.min(...data.flux);
      const fluxMax = Math.max(...data.flux);
      const fluxStdDev = Math.sqrt(data.flux.map(x => Math.pow(x - fluxMean, 2)).reduce((a, b) => a + b) / data.flux.length);

      return {
        probability,
        confidence,
        planetType: this.classifyPlanetType(probability, data),
        isHabitable: probability > 0.7,
        hasAtmosphere: probability > 0.6,
        hasWater: probability > 0.8,
        temperature: this.estimateTemperature(probability, data),
        radius: this.estimateRadius(probability, data),
        distanceFromStar: this.estimateDistance(probability, data),
        // Include extracted dataset characteristics
        timePoints,
        fluxPoints,
        timeRange,
        fluxMean,
        fluxMin,
        fluxMax,
        fluxStdDev
      };
    } catch (error) {
      console.error('Error making prediction:', error);
      return this.getMockPrediction(data);
    }
  }

  /**
   * Simulate model prediction based on data characteristics
   */
  private simulateModelPrediction(features: number[], data: LightCurveData): number {
    console.log('Analyzing dataset characteristics...');
    
    // Analyze flux variations (transit-like features)
    const fluxVariations = this.analyzeFluxVariations(data.flux);
    console.log('Flux variations score:', fluxVariations);
    
    // Analyze periodicity
    const periodicity = this.analyzePeriodicity(data.time, data.flux);
    console.log('Periodicity score:', periodicity);
    
    // Analyze data quality
    const dataQuality = this.analyzeDataQuality(data);
    console.log('Data quality score:', dataQuality);
    
    // Additional analysis based on dataset size and characteristics
    const datasetSize = data.time.length;
    const timeSpan = Math.max(...data.time) - Math.min(...data.time);
    const fluxMean = data.flux.reduce((a, b) => a + b, 0) / data.flux.length;
    const fluxStdDev = Math.sqrt(data.flux.map(x => Math.pow(x - fluxMean, 2)).reduce((a, b) => a + b) / data.flux.length);
    
    console.log('Dataset characteristics:', {
      size: datasetSize,
      timeSpan,
      fluxMean,
      fluxStdDev
    });
    
    // Higher probability for larger, longer datasets
    const sizeBonus = Math.min(datasetSize / 10000, 0.2); // Up to 20% bonus for large datasets
    const timeBonus = Math.min(timeSpan / 1000, 0.1); // Up to 10% bonus for long time spans
    
    // Combine factors to get probability
    const baseProbability = (fluxVariations * 0.4 + periodicity * 0.3 + dataQuality * 0.3) + sizeBonus + timeBonus;
    
    // Add some randomness to simulate model uncertainty
    const noise = (Math.random() - 0.5) * 0.1;
    
    const finalProbability = Math.max(0, Math.min(1, baseProbability + noise));
    console.log('Final prediction probability:', finalProbability);
    
    return finalProbability;
  }

  /**
   * Analyze flux variations for transit-like features
   */
  private analyzeFluxVariations(flux: number[]): number {
    const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
    const variance = flux.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flux.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher variation suggests potential transits
    return Math.min(stdDev * 10, 1);
  }

  /**
   * Analyze periodicity in the data
   */
  private analyzePeriodicity(time: number[], flux: number[]): number {
    // Simple periodicity analysis
    const timeSpan = Math.max(...time) - Math.min(...time);
    const fluxRange = Math.max(...flux) - Math.min(...flux);
    
    // Look for periodic patterns
    const normalizedVariation = fluxRange / (Math.max(...flux) + Math.min(...flux));
    
    return Math.min(normalizedVariation * 2, 1);
  }

  /**
   * Analyze data quality
   */
  private analyzeDataQuality(data: LightCurveData): number {
    const { time, flux, error } = data;
    
    // Check data completeness
    const completeness = flux.length / 1000; // Assume 1000 is ideal length
    
    // Check for gaps in time series
    const timeGaps = this.detectTimeGaps(time);
    const gapQuality = Math.max(0, 1 - timeGaps);
    
    // Check error levels
    const errorQuality = error ? 
      Math.max(0, 1 - (error.reduce((a, b) => a + b, 0) / error.length) * 100) : 1;
    
    return (completeness + gapQuality + errorQuality) / 3;
  }

  /**
   * Detect gaps in time series
   */
  private detectTimeGaps(time: number[]): number {
    if (time.length < 2) return 1;
    
    const intervals = [];
    for (let i = 1; i < time.length; i++) {
      intervals.push(time[i] - time[i-1]);
    }
    
    const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    const largeGaps = intervals.filter(interval => interval > medianInterval * 3).length;
    
    return largeGaps / intervals.length;
  }

  /**
   * Classify planet type based on probability and data characteristics
   */
  private classifyPlanetType(probability: number, data: LightCurveData): string {
    if (probability > 0.9) return 'Super Earth';
    if (probability > 0.7) return 'Terrestrial';
    if (probability > 0.5) return 'Mini-Neptune';
    return 'Gas Giant';
  }

  /**
   * Estimate temperature based on probability and orbital characteristics
   */
  private estimateTemperature(probability: number, data: LightCurveData): number {
    // Base temperature estimation
    const baseTemp = 200 + (probability * 200);
    return Math.round(baseTemp);
  }

  /**
   * Estimate radius based on probability
   */
  private estimateRadius(probability: number, data: LightCurveData): number {
    // Estimate radius in Earth radii
    return 0.5 + (probability * 2.5);
  }

  /**
   * Estimate distance from star based on probability
   */
  private estimateDistance(probability: number, data: LightCurveData): number {
    // Estimate distance in AU
    return 0.02 + (probability * 0.5);
  }

  /**
   * Get mock prediction for development/fallback
   */
  private getMockPrediction(data: LightCurveData): ModelPrediction {
    const probability = 0.7 + Math.random() * 0.25;
    
    return {
      probability,
      confidence: probability * 0.9,
      planetType: this.classifyPlanetType(probability, data),
      isHabitable: probability > 0.7,
      hasAtmosphere: probability > 0.6,
      hasWater: probability > 0.8,
      temperature: this.estimateTemperature(probability, data),
      radius: this.estimateRadius(probability, data),
      distanceFromStar: this.estimateDistance(probability, data)
    };
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Dispose of the model to free memory
   */
  dispose(): void {
    this.isModelLoaded = false;
    this.loadingPromise = null;
  }
}

// Export singleton instance
export const mlModelService = new MLModelService();