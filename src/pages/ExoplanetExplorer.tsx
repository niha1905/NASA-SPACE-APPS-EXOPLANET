import React, { Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExoplanetSystem } from '../components/ExoplanetSystem';
import InteractiveSolarSystem from '../components/InteractiveSolarSystem';
import { Button } from '../components/ui/button';

/**
 * ExoplanetExplorer Page
 * Main page for the interactive exoplanet solar system
 */
export const ExoplanetExplorer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'exoplanets' | 'solar-system'>('exoplanets');
  const navigate = useNavigate();

  // Simulate loading state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* Navigation */}
      <nav className="absolute top-0 right-0 z-10 p-4">
        {/* Single navigation button to return to the index/home view */}
        <Button
          variant="outline"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          onClick={() => navigate('/index')}
        >
          Back to Index
        </Button>
      </nav>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black z-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4"></div>
          <p className="text-white text-xl">Loading Exoplanet System...</p>
        </div>
      )}

      {/* Main content */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-black z-10 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
        </div>
      }>
        {viewMode === 'exoplanets' ? (
          <ExoplanetSystem />
        ) : (
          <div className="w-full h-full">
            <InteractiveSolarSystem />
          </div>
        )}
      </Suspense>

      {/* Performance controls */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/50 p-2 rounded-md text-white text-sm">
        <button 
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md mr-2"
          onClick={() => {
            // Toggle high performance mode
            const canvas = document.querySelector('canvas');
            if (canvas) {
              if (canvas.style.imageRendering === 'pixelated') {
                canvas.style.imageRendering = 'auto';
              } else {
                canvas.style.imageRendering = 'pixelated';
              }
            }
          }}
        >
          Toggle Performance Mode
        </button>
      </div>
    </div>
  );
};