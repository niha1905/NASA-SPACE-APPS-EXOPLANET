import { useState } from "react";
import InteractiveSolarSystem from "@/components/InteractiveSolarSystem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Info, RotateCcw, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";

const SolarSystem = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  const exoplanets = [
    {
      name: "Kepler-452b",
      type: "Super Earth",
      distance: "1,400 light years",
      features: ["Oceans", "Land", "Clouds", "Atmosphere"],
      color: "bg-blue-500"
    },
    {
      name: "Proxima Centauri b", 
      type: "Terrestrial",
      distance: "4.24 light years",
      features: ["Land", "Atmosphere"],
      color: "bg-red-600"
    },
    {
      name: "TRAPPIST-1e",
      type: "Terrestrial", 
      distance: "39 light years",
      features: ["Oceans", "Land", "Clouds", "Atmosphere"],
      color: "bg-blue-600"
    },
    {
      name: "K2-18b",
      type: "Mini-Neptune",
      distance: "111 light years", 
      features: ["Oceans", "Atmosphere"],
      color: "bg-indigo-800"
    },
    {
      name: "LHS 1140b",
      type: "Super Earth",
      distance: "40 light years",
      features: ["Oceans", "Ice Caps", "Atmosphere"],
      color: "bg-blue-700"
    },
    {
      name: "TOI 700d",
      type: "Terrestrial",
      distance: "101 light years",
      features: ["Oceans", "Land", "Clouds", "Atmosphere"],
      color: "bg-green-600"
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Explorer
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Interactive Solar System
              </h1>
              <p className="text-sm text-gray-300">Explore Real Exoplanets in 3D</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPlaying(!isPlaying)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset View
            </Button>
          </div>
        </div>
      </header>

      {/* Main 3D Scene */}
      <div className="fixed inset-0 pt-20">
        <InteractiveSolarSystem />
      </div>

      {/* Planet Info Panel */}
      <div className="fixed bottom-6 left-6 z-30 max-w-md">
        <Card className="bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5" />
              Exoplanet Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exoplanets.map((planet, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`w-3 h-3 rounded-full ${planet.color}`} />
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{planet.name}</div>
                    <div className="text-gray-400 text-xs">{planet.type} • {planet.distance}</div>
                  </div>
                  <div className="flex gap-1">
                    {planet.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-white/20 text-white">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <div className="fixed top-20 right-6 z-30 max-w-sm">
        <Card className="bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>Click planets to learn more</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>Mouse wheel to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>Drag to rotate view</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>Watch orbital motion</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SolarSystem;
