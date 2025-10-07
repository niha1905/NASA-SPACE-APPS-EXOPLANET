import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ModelPrediction } from '@/services/mlModelService';

interface PlanetDataContextType {
  currentPlanetData: ModelPrediction | null;
  setCurrentPlanetData: (data: ModelPrediction | null) => void;
  extractedData: {
    timePoints: number;
    fluxPoints: number;
    timeRange: number;
    fluxMean: number;
    fluxMin: number;
    fluxMax: number;
    fluxStdDev: number;
  } | null;
  setExtractedData: (data: any) => void;
  allExtractedPlanets: any[];
  setAllExtractedPlanets: (planets: any[]) => void;
}

const PlanetDataContext = createContext<PlanetDataContextType | undefined>(undefined);

export const usePlanetData = () => {
  const context = useContext(PlanetDataContext);
  if (context === undefined) {
    throw new Error('usePlanetData must be used within a PlanetDataProvider');
  }
  return context;
};

interface PlanetDataProviderProps {
  children: ReactNode;
}

export const PlanetDataProvider: React.FC<PlanetDataProviderProps> = ({ children }) => {
  const [currentPlanetData, setCurrentPlanetData] = useState<ModelPrediction | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [allExtractedPlanets, setAllExtractedPlanets] = useState<any[]>([]);

  return (
    <PlanetDataContext.Provider value={{
      currentPlanetData,
      setCurrentPlanetData,
      extractedData,
      setExtractedData,
      allExtractedPlanets,
      setAllExtractedPlanets
    }}>
      {children}
    </PlanetDataContext.Provider>
  );
};
