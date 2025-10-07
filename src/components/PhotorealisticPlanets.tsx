import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Text, Html } from "@react-three/drei";
import * as THREE from "three";

// Custom Atmosphere Shader
const AtmosphereShader = {
  uniforms: {
    color: { value: new THREE.Color(0x87CEEB) },
    opacity: { value: 0.3 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
      gl_FragColor = vec4(color, intensity * opacity);
    }
  `
};

// Planet Component with Three-Layer Approach
interface PlanetProps {
  name: string;
  surfaceColor: string;
  atmosphereColor: string;
  hasClouds: boolean;
  hasOceans: boolean;
  isTidallyLocked: boolean;
  position: [number, number, number];
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}

const Planet = ({ 
  name, 
  surfaceColor, 
  atmosphereColor, 
  hasClouds, 
  hasOceans, 
  isTidallyLocked,
  position, 
  scale, 
  isSelected, 
  onSelect 
}: PlanetProps) => {
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Surface rotation
    if (surfaceRef.current) {
      surfaceRef.current.rotation.y += 0.005;
    }
    
    // Cloud layer rotation (slightly different speed for parallax)
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.003;
    }
    
    // Atmosphere rotation
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.002;
    }
  });

  // Create surface material with realistic properties
  const surfaceMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: surfaceColor,
      metalness: hasOceans ? 0.1 : 0.3,
      roughness: hasOceans ? 0.2 : 0.8,
      emissive: isTidallyLocked ? new THREE.Color(0x2C1810) : new THREE.Color(0x000000),
      emissiveIntensity: isTidallyLocked ? 0.1 : 0.05,
    });

    // Add normal mapping for surface detail
    if (hasOceans) {
      // Create a simple normal map for ocean waves
      const normalMap = new THREE.CanvasTexture(
        (() => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d')!;
          
          // Create wave pattern
          for (let x = 0; x < 256; x++) {
            for (let y = 0; y < 256; y++) {
              const wave = Math.sin(x * 0.1) * Math.cos(y * 0.1);
              const r = Math.floor(128 + wave * 50);
              const g = Math.floor(128 + wave * 50);
              const b = Math.floor(255);
              ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
              ctx.fillRect(x, y, 1, 1);
            }
          }
          return canvas;
        })()
      );
      material.normalMap = normalMap;
      material.normalScale = new THREE.Vector2(0.3, 0.3);
    }

    // Add roughness mapping
    if (hasOceans) {
      const roughnessMap = new THREE.CanvasTexture(
        (() => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d')!;
          
          // Create roughness pattern (oceans smooth, land rough)
          for (let x = 0; x < 256; x++) {
            for (let y = 0; y < 256; y++) {
              const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05);
              const roughness = hasOceans ? (0.2 + noise * 0.1) : (0.8 + noise * 0.2);
              const gray = Math.floor(roughness * 255);
              ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
              ctx.fillRect(x, y, 1, 1);
            }
          }
          return canvas;
        })()
      );
      material.roughnessMap = roughnessMap;
    }

    return material;
  }, [surfaceColor, hasOceans, isTidallyLocked]);

  // Create cloud texture
  const cloudTexture = useMemo(() => {
    if (!hasClouds) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create cloud pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 100 + 20;
      const opacity = Math.random() * 0.8 + 0.2;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, [hasClouds]);

  const planetScale = hovered || isSelected ? scale * 1.1 : scale;

  return (
    <group position={position} scale={planetScale}>
      {/* Surface Layer */}
      <Sphere
        ref={surfaceRef}
        args={[1, 128, 128]}
        material={surfaceMaterial}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      />

      {/* Cloud Layer */}
      {hasClouds && cloudTexture && (
        <Sphere ref={cloudRef} args={[1.01, 64, 64]}>
          <meshLambertMaterial
            map={cloudTexture}
            alphaMap={cloudTexture}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Atmosphere Layer with Custom Shader */}
      <Sphere ref={atmosphereRef} args={[1.05, 32, 32]}>
        <shaderMaterial
          {...AtmosphereShader}
          uniforms-color-value={new THREE.Color(atmosphereColor)}
          uniforms-opacity-value={0.3}
          transparent
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Planet Label */}
      {(hovered || isSelected) && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      )}
    </group>
  );
};

// Starfield Background
const StarField = () => {
  const points = useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1000}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.5} />
    </points>
  );
};

// Main Scene Component
const PhotorealisticScene = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const { camera } = useThree();

  const planets = [
    {
      id: "kepler-452b",
      name: "Kepler-452b",
      surfaceColor: "#1E90FF", // Deep blue oceans
      atmosphereColor: "#87CEEB", // Light blue atmospheric glow
      hasClouds: true,
      hasOceans: true,
      isTidallyLocked: false,
      position: [0, 0, 0] as [number, number, number],
      scale: 1.0
    },
    {
      id: "proxima-centauri-b",
      name: "Proxima Centauri b",
      surfaceColor: "#8B0000", // Dark red rocky surface
      atmosphereColor: "#FF6347", // Reddish atmospheric glow
      hasClouds: false,
      hasOceans: false,
      isTidallyLocked: true,
      position: [3, 0, 0] as [number, number, number],
      scale: 0.8
    },
    {
      id: "trappist-1e",
      name: "TRAPPIST-1e",
      surfaceColor: "#4682B4", // Steel blue ocean world
      atmosphereColor: "#F0F8FF", // Pale white atmospheric glow
      hasClouds: true,
      hasOceans: true,
      isTidallyLocked: false,
      position: [-3, 0, 0] as [number, number, number],
      scale: 0.9
    },
    {
      id: "k2-18b",
      name: "K2-18b",
      surfaceColor: "#00008B", // Dark blue ocean
      atmosphereColor: "#D3D3D3", // Grayish-white atmospheric glow
      hasClouds: false,
      hasOceans: true,
      isTidallyLocked: false,
      position: [0, 3, 0] as [number, number, number],
      scale: 1.2
    }
  ];

  const handlePlanetSelect = (planetId: string) => {
    setSelectedPlanet(planetId);
    const planet = planets.find(p => p.id === planetId);
    if (planet) {
      // Smooth camera transition to planet
      const targetPosition = new THREE.Vector3(
        planet.position[0] + 5,
        planet.position[1] + 2,
        planet.position[2] + 5
      );
      
      // Animate camera to planet
      const startPosition = camera.position.clone();
      const startTime = Date.now();
      const duration = 1000; // 1 second animation
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
        camera.lookAt(planet.position[0], planet.position[1], planet.position[2]);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  };

  return (
    <>
      {/* Starfield Background */}
      <StarField />

      {/* Planets */}
      {planets.map((planet) => (
        <Planet
          key={planet.id}
          name={planet.name}
          surfaceColor={planet.surfaceColor}
          atmosphereColor={planet.atmosphereColor}
          hasClouds={planet.hasClouds}
          hasOceans={planet.hasOceans}
          isTidallyLocked={planet.isTidallyLocked}
          position={planet.position}
          scale={planet.scale}
          isSelected={selectedPlanet === planet.id}
          onSelect={() => handlePlanetSelect(planet.id)}
        />
      ))}

      {/* Lighting Setup */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        color="#FFD700"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      <ambientLight intensity={0.1} color="#404040" />

      {/* Planet Info Panel */}
      {selectedPlanet && (
        <Html position={[0, 4, 0]} center>
          <div className="bg-black/90 text-white p-6 rounded-lg backdrop-blur-sm border border-white/20 min-w-[400px]">
            <h3 className="text-2xl font-bold mb-4">
              {planets.find(p => p.id === selectedPlanet)?.name}
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Type:</span> Exoplanet</p>
              <p><span className="font-semibold">Surface:</span> {
                planets.find(p => p.id === selectedPlanet)?.hasOceans ? "Ocean World" : "Rocky Surface"
              }</p>
              <p><span className="font-semibold">Atmosphere:</span> {
                planets.find(p => p.id === selectedPlanet)?.hasClouds ? "Cloudy" : "Clear"
              }</p>
              <p><span className="font-semibold">Tidally Locked:</span> {
                planets.find(p => p.id === selectedPlanet)?.isTidallyLocked ? "Yes" : "No"
              }</p>
            </div>
            <button
              onClick={() => setSelectedPlanet(null)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Close
            </button>
          </div>
        </Html>
      )}
    </>
  );
};

// Main Component
interface PhotorealisticPlanetsProps {
  className?: string;
}

const PhotorealisticPlanets = ({ className = "" }: PhotorealisticPlanetsProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          shadowMap: true
        }}
      >
        <PhotorealisticScene />
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={3}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default PhotorealisticPlanets;
