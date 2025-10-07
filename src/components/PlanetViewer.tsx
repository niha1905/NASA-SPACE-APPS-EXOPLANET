import React, { Suspense, lazy, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useProgress, Html } from "@react-three/drei";
import { PlanetData } from "@/data/planetData";
import Planet from "./Planet";

// Loading component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center style={{ color: 'white', fontSize: '14px' }}>
      {Math.round(progress)}% loaded
    </Html>
  );
}

interface PlanetProps {
  data: PlanetData;
}

// Memoize the Planet component to prevent unnecessary re-renders
const Planet = React.memo(({ data }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Use useMemo for expensive calculations
  const planetTexture = useMemo(() => {
    return getPlanetTexture(data);
  }, [data.type, data.hasWater, data.isHabitable]);

  // Use useCallback for the frame loop to prevent recreation
  useFrame(useCallback((state) => {
    const time = state.clock.getElapsedTime();
    
    // Only update if the refs are available
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004 + Math.sin(time * 0.5) * 0.0008;
      meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.08;
    }
    
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.002;
      const scale = 1 + Math.sin(time * 2) * 0.03;
      glowRef.current.scale.setScalar(scale);
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.0015;
      atmosphereRef.current.rotation.x = Math.sin(time * 0.2) * 0.03;
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.006;
      cloudRef.current.rotation.x = Math.sin(time * 0.4) * 0.06;
    }

    if (waterRef.current) {
      waterRef.current.rotation.y += 0.002;
      waterRef.current.rotation.x = Math.sin(time * 0.6) * 0.02;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.08;
    }
  }, [])); // Empty dependency array as we don't depend on any props in the frame loop

  const glowIntensity = data.probability * 2;
  
    // Create realistic planet appearances based on NASA imagery
  const getPlanetTexture = (planetData: PlanetData) => {
    switch (planetData.type) {
      case 'Terrestrial':
        if (planetData.hasWater) {
          return {
            color: '#1E40AF', // Deep ocean blue
            emissive: '#0F172A', // Very dark blue
            roughness: 0.9,
            metalness: 0.05,
            // Add some landmass colors
            secondaryColor: '#8B4513'
          };
        } else {
          return {
            color: '#8B4513', // Mars-like red-brown
            emissive: '#4A1C1C', // Dark red
            roughness: 0.8,
            metalness: 0.1,
            secondaryColor: '#CD853F'
          };
        }
      case 'Super Earth':
        if (data.hasWater) {
          return {
            color: '#1E3A8A', // Earth-like blue
            emissive: '#0F172A',
            roughness: 0.85,
            metalness: 0.08,
            secondaryColor: '#2E8B57'
          };
        } else {
          return {
            color: '#A0522D', // Rocky brown
            emissive: '#4A1C1C',
            roughness: 0.9,
            metalness: 0.05,
            secondaryColor: '#8B4513'
          };
        }
      case 'Mini-Neptune':
        return {
          color: '#1E40AF', // Neptune-like deep blue
          emissive: '#0F172A',
          roughness: 0.2,
          metalness: 0.1,
          secondaryColor: '#3B82F6'
        };
      default:
        return {
          color: data.color,
          emissive: '#0F172A',
          roughness: 0.7,
          metalness: 0.2,
          secondaryColor: data.color
        };
    }
  };

  const texture = getPlanetTexture();

  return (
    <group ref={groupRef}>
      {/* Planet Core with realistic surface */}
      <Sphere ref={meshRef} args={[1, 128, 128]}>
        <meshStandardMaterial
          color={texture.color}
          metalness={texture.metalness}
          roughness={texture.roughness}
          emissive={texture.emissive}
          emissiveIntensity={0.05}
          normalScale={[0.5, 0.5]}
        />
      </Sphere>

      {/* Landmass details for terrestrial planets */}
      {data.type === 'Terrestrial' && (
        <Sphere args={[1.001, 64, 64]}>
          <meshLambertMaterial
            color={texture.secondaryColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Realistic cloud layers for habitable planets */}
      {data.isHabitable && (
        <Sphere ref={cloudRef} args={[1.008, 64, 64]}>
          <meshLambertMaterial
            color="#F8FAFC"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Ocean surface for water worlds */}
      {data.hasWater && (
        <Sphere ref={waterRef} args={[1.003, 64, 64]}>
          <meshPhongMaterial
            color="#1E40AF"
            transparent
            opacity={0.7}
            shininess={150}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Realistic atmospheric layers */}
      {data.hasAtmosphere && (
        <>
          {/* Inner atmosphere */}
          <Sphere ref={atmosphereRef} args={[1.05, 32, 32]}>
            <meshPhongMaterial
              color={data.isHabitable ? "#87CEEB" : "#FF6B6B"}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              shininess={30}
            />
          </Sphere>
          {/* Outer atmosphere */}
          <Sphere args={[1.12, 24, 24]}>
            <meshPhongMaterial
              color={data.isHabitable ? "#E0F2FE" : "#FED7D7"}
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
              shininess={20}
            />
          </Sphere>
        </>
      )}

      {/* Outer Glow Ring */}
      <Sphere ref={glowRef} args={[1.2, 32, 32]}>
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.05 * data.probability}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* NASA-style Lighting System */}
      {/* Main sun light */}
      <directionalLight 
        position={[5, 3, 5]} 
        intensity={1.5}
        color="#FFD700"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Secondary fill light */}
      <directionalLight 
        position={[-2, 1, -2]} 
        intensity={0.3}
        color="#87CEEB"
      />

      {/* Ambient space lighting */}
      <ambientLight intensity={0.2} color="#1E293B" />
      
      {/* Rim lighting for atmosphere */}
      <pointLight
        position={[0, 0, -4]}
        intensity={0.6}
        color="#E0F2FE"
        distance={8}
      />

      {/* Atmospheric glow */}
      <pointLight
        position={[0, 0, 0]}
        intensity={0.1}
        color={data.isHabitable ? "#87CEEB" : "#FF6B6B"}
        distance={2}
      />
    </group>
  );
});

interface PlanetViewerProps {
  planetData: PlanetData;
}
const LazyPlanet = lazy(() => import('./Planet'));

const PlanetViewer = ({ planetData }: PlanetViewerProps) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ 
          position: [0, 0, 5], 
          fov: 50, 
          near: 0.1, 
          far: 1000 
        }}
        dpr={[1, 2]} // Better quality on high DPI displays
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        {/* Removed the background color to allow StarField to show through */}
        <Suspense fallback={<Loader />}>
          {/* Main lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          {/* Scene contents */}
          <LazyPlanet data={planetData} />
          
          {/* Controls */}
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={2}
            maxDistance={8}
            autoRotate
            autoRotateSpeed={0.3}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default PlanetViewer;
