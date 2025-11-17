import React, { useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Globe, Sun } from 'lucide-react';
import { getTemperature, getRadius, getDistance, getProbability, getConfidence, isHabitable } from '@/lib/predictionUtils';
import { ModelPrediction } from '@/services/mlModelService';

interface SolarSystemVisualizerProps {
  prediction: ModelPrediction;
  planetName?: string;
  starName?: string;
  width?: number;
  height?: number;
  interactive?: boolean;
}

/**
 * 3D Solar System Visualization based on ML predictions
 * Shows accurate orbital positions, planet size, and star properties
 */
export const SolarSystemVisualizer: React.FC<SolarSystemVisualizerProps> = ({
  prediction,
  planetName = 'Exoplanet',
  starName = 'Star',
  width = 600,
  height = 400,
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef<number>(0);

  // Calculate star properties
  const starRadiusPx = 20;
  const starLuminosity = 1; // Normalized
  const starColor = `hsl(${Math.max(0, Math.min(360, (prediction.temperature - 3000) / 30))}, 100%, 50%)`;

  // Calculate orbital properties
  const orbitRadiusPx = Math.min(width, height) * 0.35; 
  const planetRadiusPx = Math.max(4, Math.min(15, prediction.radius * 2));

  // Calculate semi-major and semi-minor axes for elliptical orbit
  const semiMajorAxis = orbitRadiusPx;
  const eccentricity = 0.2; // Typical exoplanet eccentricity
  const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

  const centerX = width / 2;
  const centerY = height / 2;

  // Generate orbital trail
  const orbitTrail = useMemo(() => {
    const points = [];
    for (let i = 0; i < 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const x = centerX + semiMajorAxis * Math.cos(angle);
      const y = centerY + semiMinorAxis * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  }, [centerX, centerY, semiMajorAxis, semiMinorAxis]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas with space background
      ctx.fillStyle = '#000a1a';
      ctx.fillRect(0, 0, width, height);

      // Draw a simple starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let s = 0; s < 50; s++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        const size = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw orbit trail
      ctx.strokeStyle = 'rgba(200, 200, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(orbitTrail[0].x, orbitTrail[0].y);
      for (let j = 1; j < orbitTrail.length; j++) {
        ctx.lineTo(orbitTrail[j].x, orbitTrail[j].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw star with glow effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, starRadiusPx * 3);
      gradient.addColorStop(0, starColor);
      gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, starRadiusPx * 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw star core
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, starRadiusPx, 0, Math.PI * 2);
      ctx.fill();

      // Calculate planet position
      const angle = ((rotationRef.current % 360) * Math.PI) / 180;
      const planetX = centerX + semiMajorAxis * Math.cos(angle);
      const planetY = centerY + semiMinorAxis * Math.sin(angle);

      // Color based on temperature
      const temp = getTemperature(prediction);
      let planetColor = '#4a90e2';
      if (temp < 200) {
        planetColor = '#87ceeb'; // Ice
      } else if (temp < 373) {
        planetColor = '#2ecc71'; // Habitable
      } else if (temp < 600) {
        planetColor = '#e74c3c'; // Hot
      } else {
        planetColor = '#f39c12'; // Very hot
      }

      const planetGradient = ctx.createRadialGradient(
        planetX - planetRadiusPx * 0.3,
        planetY - planetRadiusPx * 0.3,
        0,
        planetX,
        planetY,
        planetRadiusPx * 2
      );
      planetGradient.addColorStop(0, planetColor);
      planetGradient.addColorStop(0.7, planetColor);
      planetGradient.addColorStop(1, 'rgba(100, 150, 255, 0.1)');

      ctx.fillStyle = planetGradient;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadiusPx * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw planet core
      ctx.fillStyle = planetColor;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadiusPx, 0, Math.PI * 2);
      ctx.fill();

      // Draw info panel background
      const panelX = 10;
      const panelY = 10;
      const panelWidth = 200;
      const panelHeight = 120;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

      // Draw info text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(starName, panelX + 10, panelY + 20);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
      ctx.fillText(`Temp: ${prediction.temperature.toFixed(0)}K`, panelX + 10, panelY + 35);
      ctx.fillText(`Radius: ${prediction.radius.toFixed(2)}R⊕`, panelX + 10, panelY + 48);
      ctx.fillText(`Type: ${prediction.planetType}`, panelX + 10, panelY + 61);
      ctx.fillText(`Habitable: ${prediction.isHabitable ? 'Yes' : 'No'}`, panelX + 10, panelY + 74);
      ctx.fillText(`Model: ${(prediction.probability * 100).toFixed(1)}%`, panelX + 10, panelY + 87);
      ctx.fillText(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`, panelX + 10, panelY + 100);

      // Draw distance indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${prediction.distanceFromStar.toFixed(3)} AU`, planetX, planetY + planetRadiusPx + 40);

      // Draw orbital line from star to planet
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(planetX, planetY);
      ctx.stroke();

      // Draw velocity vector
      const velocityLength = 30;
      const velocityAngle = angle + Math.PI / 2;
      const vx = planetX + Math.cos(velocityAngle) * velocityLength;
      const vy = planetY + Math.sin(velocityAngle) * velocityLength;

      ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(planetX, planetY);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      const arrowSize = 5;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx - arrowSize * Math.cos(velocityAngle - 0.3), vy - arrowSize * Math.sin(velocityAngle - 0.3));
      ctx.lineTo(vx - arrowSize * Math.cos(velocityAngle + 0.3), vy - arrowSize * Math.sin(velocityAngle + 0.3));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Draw small temperature label above planet
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${getTemperature(prediction).toFixed(0)}K`, planetX, planetY - planetRadiusPx - 8);

      // Update rotation
      rotationRef.current += 0.5;

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, centerX, centerY, starRadiusPx, planetRadiusPx, orbitTrail, prediction, starName]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-primary" />
          Orbital System Visualization
          <Badge variant="outline" className="ml-auto text-xs">
            {interactive ? 'Live' : 'Static'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full rounded-lg bg-black/30 border border-primary/20"
        />

        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="bg-card/50 rounded-lg p-3 border border-orange-200">
            <div className="font-semibold text-orange-600">Star Temp</div>
            <div className="text-lg font-bold">{prediction.temperature.toFixed(0)}K</div>
          </div>
          <div className="bg-card/50 rounded-lg p-3 border border-blue-200">
            <div className="font-semibold text-blue-600">Orbital Period</div>
            <div className="text-lg font-bold">{(prediction.distanceFromStar ** 1.5).toFixed(1)}d</div>
          </div>
          <div className="bg-card/50 rounded-lg p-3 border border-green-200">
            <div className="font-semibold text-green-600">Habitability</div>
            <div className="text-lg font-bold">{prediction.isHabitable ? 'Viable' : 'Poor'}</div>
          </div>
          <div className="bg-card/50 rounded-lg p-3 border border-purple-200">
            <div className="font-semibold text-purple-600">Detection</div>
            <div className="text-lg font-bold">{(prediction.probability * 100).toFixed(0)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SolarSystemVisualizer;
