import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { EnhancedPlanet } from './EnhancedPlanet';
import { planets as defaultPlanets } from '../data/planetData';
import { usePlanetData } from '@/contexts/PlanetDataContext';
import PlanetCard from './PlanetCard';

// Star component for the central star
const CentralStar: React.FC<{ position: [number, number, number], color: string }> = ({ position, color }) => {
  const starRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (starRef.current) {
      // Enhanced pulsing effect for the star
      const time = clock.getElapsedTime();
      const scale = 1 + Math.sin(time * 0.5) * 0.05; // Increased pulsing amplitude
      starRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <mesh ref={starRef} position={position}>
      <sphereGeometry args={[2.5, 64, 64]} /> {/* Increased star size */}
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={1.5} // Increased emissive intensity
        toneMapped={false} 
      />
      {/* Add point light to illuminate the planets */}
      <pointLight 
        color={color} 
        intensity={2.5} // Increased light intensity
        distance={150} // Increased light distance
        decay={1.5} // Reduced decay for wider illumination
        castShadow 
      />
    </mesh>
  );
};

// Orbit path visualization with click interaction
const OrbitPath: React.FC<{ 
  radius: number, 
  color?: string,
  planet?: any,
  onSelect?: (planet: any) => void
}> = ({ 
  radius, 
  color = '#555555',
  planet,
  onSelect 
}) => {
  // Handle click on orbit path
  const handleClick = () => {
    if (planet && onSelect) {
      onSelect(planet);
    }
  };

  return (
    <mesh 
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={-1}
      onClick={handleClick}
      // Change cursor to pointer when hovering over orbit path
      onPointerOver={(e) => {
        document.body.style.cursor = 'pointer';
        e.stopPropagation();
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <ringGeometry args={[radius - 0.02, radius + 0.02, 128]} /> {/* Wider orbit path */}
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} /> {/* Avoid occluding planets */}
    </mesh>
  );
};

// Planet with orbit animation
const OrbitingPlanet: React.FC<{ 
  planet: any, 
  orbitRadius: number, 
  orbitSpeed: number,
  initialAngle?: number,
  yOffset?: number,
  onHover: (hovering: boolean, planet: any) => void,
  onSelect?: (planet: any) => void
}> = ({ 
  planet, 
  orbitRadius, 
  orbitSpeed, 
  initialAngle = 0,
  yOffset = 0,
  onHover,
  onSelect
}) => {
  // Use a ref for angle so we don't trigger React re-renders every frame
  const angleRef = useRef(initialAngle);
  const planetRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // Increment angle based on orbitSpeed and frame delta for consistent motion
    angleRef.current += orbitSpeed * delta;

    if (planetRef.current) {
      const a = angleRef.current;
      const x = Math.cos(a) * orbitRadius;
      const z = Math.sin(a) * orbitRadius;
      planetRef.current.position.set(x, 0, z);
    }
  });

  const isTransitName = (planet?.name && typeof planet.name === 'string' && planet.name.toLowerCase().includes('transit'));

  return (
    <group 
      ref={planetRef}
      // start at origin; position is updated each frame by useFrame
      position={[0, isTransitName ? Math.max(0.5, yOffset) : yOffset, 0]}
      renderOrder={isTransitName ? 1 : 0}
      onClick={() => onSelect && onSelect(planet)}
      onPointerOver={(e) => { document.body.style.cursor = 'pointer'; e.stopPropagation(); }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <EnhancedPlanet 
        planet={planet} 
        position={[0, 0, 0]} 
        scale={Math.max(planet.radius * 0.6, isTransitName ? 0.7 : 0.5)} // Slightly larger minimum for transit planet
        onHover={onHover}
      />

      {/* Add a subtle highlight halo for transit planets to improve visibility */}
      {isTransitName && (
        <mesh rotation={[Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <ringGeometry args={[0.85, 1.1, 64]} />
          <meshBasicMaterial color={'#FFAA33'} transparent opacity={0.5} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  );
};

// Info panel that displays when hovering over a planet
const PlanetInfoPanel: React.FC<{ planet: any | null }> = ({ planet }) => {
  if (!planet) return null;
  
  return (
    <div className="absolute bottom-4 left-4 bg-black/70 text-white p-4 rounded-lg max-w-md">
      <h2 className="text-xl font-bold mb-2">{planet.name}</h2>
      <p className="mb-2">{planet.description}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-semibold">Type:</span> {planet.type}
        </div>
        <div>
          <span className="font-semibold">Radius:</span> {planet.radius} Earth radii
        </div>
        <div>
          <span className="font-semibold">Distance:</span> {planet.distanceFromStar} AU
        </div>
        <div>
          <span className="font-semibold">Temperature:</span> {planet.temperature}K
        </div>
        <div>
          <span className="font-semibold">Water:</span> {planet.hasWater ? 'Yes' : 'No'}
        </div>
        <div>
          <span className="font-semibold">Atmosphere:</span> {planet.hasAtmosphere ? 'Yes' : 'No'}
        </div>
        <div>
          <span className="font-semibold">Habitable:</span> {planet.isHabitable ? 'Potentially' : 'No'}
        </div>
      </div>
      {planet.surfaceFeatures && (
        <div className="mt-2">
          <span className="font-semibold">Surface Features:</span> {planet.surfaceFeatures}
        </div>
      )}
    </div>
  );
};

// Main ExoplanetSystem component
export const ExoplanetSystem: React.FC = () => {
  const { allExtractedPlanets, extractedData } = usePlanetData();
  const [hoveredPlanet, setHoveredPlanet] = useState<any | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<any | null>(null);
  
  // Handle planet hover
  const handlePlanetHover = (hovering: boolean, planet: any) => {
    setHoveredPlanet(hovering ? planet : null);
  };
  
  // Calculate orbit radii and speeds
  // Prefer ML-generated planets when available
  const sourcePlanets = allExtractedPlanets && allExtractedPlanets.length > 0 ? allExtractedPlanets : defaultPlanets;

  // Map source data to the renderer's expected shape and compute visual properties
  const planetConfigs = sourcePlanets.map((p: any, index: number) => {
    const numericRadius = Number(p.radius);
    const radius = Math.max(0.3, Number.isFinite(numericRadius) ? numericRadius : 1);

    // Determine habitat category and choose palette
    const habitat = (() => {
      if (p.isHabitable) return 'habitable';
      if (p.hasWater && p.hasAtmosphere) return 'ocean';
      if (p.type && p.type.toLowerCase().includes('gas')) return 'gas';
      if (p.hasIce) return 'icy';
      if (p.hasAtmosphere) return 'atmospheric';
      return 'rocky';
    })();

    // Palette by habitat
    let color = p.color || '#888888';
    let atmosphereColor = p.atmosphereColor || undefined;
    let emissiveColor = '#000000';
    let atmosphereOpacity = p.atmosphereOpacity ?? 0.3;

    switch (habitat) {
      case 'habitable':
        color = p.color || '#33C6A6'; // teal-green for life-friendly worlds
        atmosphereColor = atmosphereColor || '#9EEBCF';
        emissiveColor = '#66FFAA';
        atmosphereOpacity = Math.max(0.35, atmosphereOpacity);
        break;
      case 'ocean':
        color = p.color || '#1E90FF'; // deep blue oceans
        atmosphereColor = atmosphereColor || '#BEE9FF';
        emissiveColor = '#2244FF';
        atmosphereOpacity = Math.max(0.25, atmosphereOpacity);
        break;
      case 'gas':
        color = p.color || '#FF8C00'; // warm gas giants
        atmosphereColor = atmosphereColor || '#FFD6A5';
        emissiveColor = '#FFAA33';
        atmosphereOpacity = Math.max(0.45, atmosphereOpacity);
        break;
      case 'icy':
        color = p.color || '#E6FFFF'; // pale cyan
        atmosphereColor = atmosphereColor || '#EAF6FF';
        emissiveColor = '#CCFFFF';
        atmosphereOpacity = Math.max(0.2, atmosphereOpacity);
        break;
      case 'atmospheric':
        color = p.color || '#A0A0FF';
        atmosphereColor = atmosphereColor || '#DDE8FF';
        emissiveColor = '#8899FF';
        atmosphereOpacity = Math.max(0.25, atmosphereOpacity);
        break;
      default:
        color = p.color || '#9E9E9E';
        atmosphereColor = atmosphereColor || '#CFCFCF';
        emissiveColor = '#666666';
        atmosphereOpacity = Math.max(0.15, atmosphereOpacity);
    }

    // compute orbit speed: smaller planets spin/orbit faster visually
    const baseSpeed = 0.6;
    const orbitSpeed = baseSpeed * (1 / (radius + 0.2));

    // Ensure every planet has at least a minimal radius and distance so none collapse at star
    const safeRadius = Math.max(0.3, radius);
    const numericDistance = Number(p.distanceFromStar);
    const safeDistance = Math.max(2, Number.isFinite(numericDistance) ? numericDistance : (1 + index * 0.5));

    const isTransit = (p.name && typeof p.name === 'string' && p.name.toLowerCase().includes('transit'));
    const mappedPlanet = {
      ...p,
      name: p.name || p.id || `Planet ${index + 1}`,
      description: p.description || p.name || '',
      type: p.type || 'Unknown',
      radius: safeRadius,
      distanceFromStar: safeDistance,
      temperature: p.temperature || 0,
      hasWater: Boolean(p.hasWater),
      hasAtmosphere: Boolean(p.hasAtmosphere),
      hasClouds: Boolean(p.hasAtmosphere || p.hasClouds),
      isHabitable: Boolean(p.isHabitable),
      rotationSpeed: p.rotationSpeed || (0.01 * (2 / Math.max(radius, 0.2))),
      cloudRotationSpeed: p.cloudRotationSpeed || 0.006,
      atmosphereRotationSpeed: p.atmosphereRotationSpeed || 0.003,
      color,
      atmosphereColor,
      atmosphereOpacity,
      emissiveColor: isTransit ? '#FFAA33' : emissiveColor,
      hasLand: Boolean(p.hasLand),
  // Prefer the global extractedData (from MLAnalysis/upload) so all planet details show dataset stats
  datasetInfo: extractedData || p.datasetInfo || p.dataset || null,
      mlIndex: index
    };

    return {
      planet: mappedPlanet,
      orbitRadius: 5 + index * 4,
      orbitSpeed,
      initialAngle: Math.random() * Math.PI * 2,
      yOffset: 0.1 + (index % 3) * 0.08 // stagger heights to reduce overlap
    };
  });
  
  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows 
        camera={{ position: [0, 20, 20], fov: 50 }}
        dpr={[1, 2]} // Responsive pixel ratio
        gl={{ alpha: false }} // Disable alpha for pure black background
        style={{ background: '#000000' }} // Set background to pure black
      >
        {/* Increased ambient light for better base illumination */}
        <ambientLight intensity={0.25} />
        
        {/* Stars removed as requested */}
        
        {/* Central star - brighter for better illumination */}
        <CentralStar position={[0, 0, 0]} color="#FFD700" />
        
        {/* Orbit paths - make rings clickable to select the corresponding planet */}
        {planetConfigs.map((config, index) => (
      <OrbitPath 
            key={`orbit-${config.planet.name || config.planet.id || index}-ring`} 
            radius={config.orbitRadius} 
            planet={config.planet}
            onSelect={(planet) => setSelectedPlanet(planet)}
          />
        ))}
        
        {/* Planets */}
        {planetConfigs.map((config, index) => (
        <OrbitingPlanet 
        key={`planet-${config.planet.name || config.planet.id || index}`}
        planet={config.planet}
        orbitRadius={config.orbitRadius}
        orbitSpeed={config.orbitSpeed}
        initialAngle={config.initialAngle}
          yOffset={config.yOffset}
        onHover={handlePlanetHover}
        onSelect={(planet) => setSelectedPlanet(planet)}
          />
        ))}
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          target={[0, 0, 0]}
        />
      </Canvas>
      
      {/* Planet info panel (hover) */}
      <PlanetInfoPanel planet={hoveredPlanet} />

      {/* Selected planet details (click) */}
      {selectedPlanet && (
        <PlanetCard planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}
      
      {/* Title */}
      <div className="absolute top-4 left-4 text-white">
        <h1 className="text-2xl font-bold">Exoplanet Explorer</h1>
        <p>Hover over planets to learn more</p>
        <p className="text-xs opacity-70">Rendering {planetConfigs.length} / {sourcePlanets.length} planets</p>
      </div>

      {/* Debug panel to verify planet list consistency */}
      <div className="absolute top-4 right-4 text-white text-xs bg-black/40 rounded-md p-2 max-w-xs">
        <div className="font-semibold mb-1">Planets in system</div>
        {sourcePlanets.map((p: any, i: number) => (
          <div key={`dbg-${p.id || p.name || i}`} className="truncate">
            {(p.name || p.id || `Planet ${i + 1}`)}
          </div>
        ))}
      </div>
    </div>
  );
};