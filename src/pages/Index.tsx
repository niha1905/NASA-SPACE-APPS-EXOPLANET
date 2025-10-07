import { useState, useEffect, Suspense, lazy } from "react";
import StarField from "@/components/StarField";
import PlanetCard from "@/components/PlanetCard";
import NavigationControls from "@/components/NavigationControls";
import { planets } from "@/data/planetData";
import { Button } from "@/components/ui/button";
import { Info, Globe, Loader2, Brain } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanetData } from "@/contexts/PlanetDataContext";

// Lazy load the heavy 3D viewer
const LazyPlanetViewer = lazy(() => import("@/components/PlanetViewer"));

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentPlanetData, extractedData, allExtractedPlanets } = usePlanetData();
  const [currentPlanetIndex, setCurrentPlanetIndex] = useState(0);
  
  // Use extracted planets if available, otherwise fall back to static data
  const availablePlanets = allExtractedPlanets.length > 0 ? allExtractedPlanets : planets;
  const currentPlanet = availablePlanets[currentPlanetIndex] || planets[currentPlanetIndex];
  // If extractedData from MLAnalysis exists, merge it into the displayed planet so dataset stats show up
  const displayedPlanet = { ...currentPlanet, ...(extractedData || {}) };
  
  // Debug logging
  console.log('Available planets:', availablePlanets);
  console.log('Current planet:', currentPlanet);
  console.log('Current planet index:', currentPlanetIndex);

  // Check URL for planet details view
  const showDetails = location.search.includes('details=true');

  // Sync URL with state
  useEffect(() => {
    // Accept query params from either `/` or `/index` routes
    const searchParams = new URLSearchParams(location.search);
    const planetIndex = parseInt(searchParams.get('planet') || '0', 10);
    const maxIndex = availablePlanets.length - 1;
    if (!isNaN(planetIndex) && planetIndex >= 0 && planetIndex <= maxIndex) {
      setCurrentPlanetIndex(planetIndex);
    }
  }, [location.search, availablePlanets.length]);

  const handleShowDetails = () => {
    // preserve current route base (either / or /index)
    const base = location.pathname === '/index' ? '/index' : '/';
    navigate(`${base}?planet=${currentPlanetIndex}&details=true`, { replace: true });
  };

  const handleCloseDetails = () => {
    navigate(`/index?planet=${currentPlanetIndex}`, { replace: true });
  };

  const handleNext = () => {
    const nextIndex = (currentPlanetIndex + 1) % availablePlanets.length;
    navigate(`/index?planet=${nextIndex}${showDetails ? '&details=true' : ''}`, { replace: true });
  };

  const handlePrevious = () => {
    const prevIndex = (currentPlanetIndex - 1 + availablePlanets.length) % availablePlanets.length;
    navigate(`/index?planet=${prevIndex}${showDetails ? '&details=true' : ''}`, { replace: true });
  };


  // Add a loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for the 3D viewer
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* StarField Background */}
      <StarField />
      
      {/* Main Content */}
      <div className="relative z-10">
        {/* Navigation Links */}
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          {/* Removed duplicate Explore Exoplanets button */}
        </div>
        {/* 3D Viewer */}
        <div className="fixed inset-0">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
                <p className="text-white">Loading planet data...</p>
              </div>
            </div>
          }>
              <motion.div
              key={displayedPlanet.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <LazyPlanetViewer planetData={displayedPlanet} />
            </motion.div>
          </Suspense>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onAnimationComplete={() => setIsLoading(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
                <p className="text-white text-lg">Loading Stellar Experience...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                ExoVision 3D
              </h1>
              <p className="text-sm text-muted-foreground">AI-Powered Planet Explorer</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleShowDetails}
                className="border-primary/50 hover:border-primary hover:bg-primary/10"
              >
                <Info className="h-4 w-4 mr-2" />
                Planet Details
              </Button>
              <Link to="/exoplanet-explorer">
                <Button
                  variant="outline"
                  className="border-primary/50 hover:border-primary hover:bg-primary/10"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Explore Exoplanets
                </Button>
              </Link>
              {/* Photorealistic view removed */}
              <Link to="/ml-analysis">
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Start AI Analysis
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Planet Info Overlay */}
        <div className="fixed top-1/2 left-6 -translate-y-1/2 z-30 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-foreground">
              {displayedPlanet.name}
            </h2>
            {allExtractedPlanets.length > 0 && (
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                AI Data
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground font-medium">{currentPlanet.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Probability:</span>
              <span className="text-primary font-bold">
                {Math.round(currentPlanet.probability * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Radius:</span>
              <span className="text-foreground">{displayedPlanet.radius.toFixed(2)} R⊕</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature:</span>
              <span className="text-foreground">{currentPlanet.temperature}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance:</span>
              <span className="text-foreground">{displayedPlanet.distanceFromStar.toFixed(3)} AU</span>
            </div>
            {displayedPlanet.timePoints && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Points:</span>
                <span className="text-foreground">{displayedPlanet.timePoints.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
          <NavigationControls
            onPrevious={handlePrevious}
            onNext={handleNext}
            currentIndex={currentPlanetIndex}
            total={availablePlanets.length}
          />
        </div>

        {/* Planet Details Panel */}
        {showDetails && (
          <PlanetCard 
            planet={displayedPlanet} 
            onClose={handleCloseDetails}
            onNext={handleNext}
            onPrevious={handlePrevious}
            currentIndex={currentPlanetIndex}
            totalPlanets={availablePlanets.length}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
