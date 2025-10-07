import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SolarSystem from "./pages/SolarSystem";
import NotFound from "./pages/NotFound";
import { ExoplanetExplorer } from "./pages/ExoplanetExplorer";
import MLAnalysis from "./pages/MLAnalysis";
import { PlanetDataProvider } from "./contexts/PlanetDataContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PlanetDataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/" element={<MLAnalysis />} />
            <Route path="/index" element={<Index />} />
            <Route path="/solar-system" element={<SolarSystem />} />
            <Route path="/exoplanet-explorer" element={<ExoplanetExplorer />} />
            <Route path="/ml-analysis" element={<MLAnalysis />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PlanetDataProvider>
  </QueryClientProvider>
);

export default App;
