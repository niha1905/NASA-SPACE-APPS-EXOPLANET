import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Text, Html } from "@react-three/drei";
import * as THREE from "three";

// Planet data with realistic properties
const exoplanets = [
  {
    id: "kepler-452b",
    name: "Kepler-452b",
    star: "Kepler-452",
    type: "Super Earth",
    distance: 1400, // light years
    radius: 1.6, // Earth radii
    color: "#1E90FF",
    landColor: "#228B22",
    cloudColor: "#FFFFFF",
    hasOceans: true,
    hasLand: true,
    hasClouds: true,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 2.5,
    orbitSpeed: 0.01
  },
  {
    id: "proxima-centauri-b",
    name: "Proxima Centauri b",
    star: "Proxima Centauri",
    type: "Terrestrial",
    distance: 4.24, // light years
    radius: 1.17,
    color: "#8B0000",
    atmosphereColor: "#FF6347",
    hasOceans: false,
    hasLand: true,
    hasClouds: false,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 3.5,
    orbitSpeed: 0.015
  },
  {
    id: "trappist-1e",
    name: "TRAPPIST-1e",
    star: "TRAPPIST-1",
    type: "Terrestrial",
    distance: 39, // light years
    radius: 0.92,
    color: "#4682B4",
    landColor: "#D2691E",
    skyColor: "#B22222",
    hasOceans: true,
    hasLand: true,
    hasClouds: true,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 4.5,
    orbitSpeed: 0.02
  },
  {
    id: "k2-18b",
    name: "K2-18b",
    star: "K2-18",
    type: "Mini-Neptune",
    distance: 111, // light years
    radius: 2.61,
    color: "#00008B",
    atmosphereColor: "#A9A9A9",
    hasOceans: true,
    hasLand: false,
    hasClouds: false,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 5.5,
    orbitSpeed: 0.008
  },
  {
    id: "lhs-1140b",
    name: "LHS 1140b",
    star: "LHS 1140",
    type: "Super Earth",
    distance: 40, // light years
    radius: 1.43,
    color: "#0000CD",
    iceColor: "#F0FFFF",
    hasOceans: true,
    hasLand: false,
    hasClouds: false,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 6.5,
    orbitSpeed: 0.012
  },
  {
    id: "toi-700d",
    name: "TOI 700d",
    star: "TOI 700",
    type: "Terrestrial",
    distance: 101, // light years
    radius: 1.19,
    color: "#1E90FF",
    landColor: "#32CD32",
    cloudColor: "#FFFFFF",
    hasOceans: true,
    hasLand: true,
    hasClouds: true,
    hasAtmosphere: true,
    position: [0, 0, 0],
    orbitRadius: 7.5,
    orbitSpeed: 0.006
  }
];

// Individual Planet Component
interface PlanetProps {
  planet: typeof exoplanets[0];
  isSelected: boolean;
  onSelect: (planet: typeof exoplanets[0]) => void;
  time: number;
}

const Planet = ({ planet, isSelected, onSelect, time }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate orbital position
  const orbitalX = Math.cos(time * planet.orbitSpeed) * planet.orbitRadius;
  const orbitalZ = Math.sin(time * planet.orbitSpeed) * planet.orbitRadius;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.003;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.002;
    }
  });

  const scale = hovered || isSelected ? 1.2 : 1;

  return (
    <group position={[orbitalX, 0, orbitalZ]}>
      {/* Planet Core */}
      <Sphere
        ref={meshRef}
        args={[planet.radius * 0.3, 64, 64]}
        scale={scale}
        onClick={() => onSelect(planet)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={planet.color}
          metalness={0.1}
          roughness={0.8}
          emissive={planet.color}
          emissiveIntensity={0.05}
        />
      </Sphere>

      {/* Land masses for terrestrial planets */}
      {planet.hasLand && planet.landColor && (
        <Sphere args={[planet.radius * 0.301, 32, 32]}>
          <meshLambertMaterial
            color={planet.landColor}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Ice caps for LHS 1140b */}
      {planet.id === "lhs-1140b" && planet.iceColor && (
        <Sphere args={[planet.radius * 0.302, 32, 32]}>
          <meshLambertMaterial
            color={planet.iceColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Cloud layers */}
      {planet.hasClouds && planet.cloudColor && (
        <Sphere ref={cloudRef} args={[planet.radius * 0.305, 32, 32]}>
          <meshLambertMaterial
            color={planet.cloudColor}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </Sphere>
      )}

      {/* Atmospheric layers */}
      {planet.hasAtmosphere && (
        <Sphere ref={atmosphereRef} args={[planet.radius * 0.35, 24, 24]}>
          <meshPhongMaterial
            color={planet.atmosphereColor || planet.skyColor || "#87CEEB"}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            shininess={50}
          />
        </Sphere>
      )}

      {/* Planet Label */}
      {(hovered || isSelected) && (
        <Text
          position={[0, planet.radius * 0.5, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {planet.name}
        </Text>
      )}

      {/* Orbit line */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planet.orbitRadius - 0.1, planet.orbitRadius + 0.1, 64]} />
        <meshBasicMaterial color="#444444" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Central Star Component
const CentralStar = () => {
  const starRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (starRef.current) {
      starRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      {/* Star core */}
      <Sphere ref={starRef} args={[0.5, 32, 32]}>
        <meshBasicMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.8}
        />
      </Sphere>
      
      {/* Star corona */}
      <Sphere args={[0.7, 16, 16]}>
        <meshBasicMaterial
          color="#FFA500"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
};

// Main Solar System Component
const SolarSystem = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<typeof exoplanets[0] | null>(null);
  const [time, setTime] = useState(0);

  useFrame(() => {
    setTime(prev => prev + 0.01);
  });

  return (
    <>
      {/* Central Star */}
      <CentralStar />

      {/* Planets */}
      {exoplanets.map((planet) => (
        <Planet
          key={planet.id}
          planet={planet}
          isSelected={selectedPlanet?.id === planet.id}
          onSelect={setSelectedPlanet}
          time={time}
        />
      ))}

      {/* Lighting */}
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#FFD700" castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} color="#87CEEB" />
      <ambientLight intensity={0.2} color="#1E293B" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#FFD700" distance={20} />

      {/* Planet Info Panel */}
      {selectedPlanet && (
        <Html position={[0, 3, 0]} center>
          <div className="bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm border border-white/20 min-w-[300px]">
            <h3 className="text-xl font-bold mb-2">{selectedPlanet.name}</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Star:</span> {selectedPlanet.star}</p>
              <p><span className="font-semibold">Type:</span> {selectedPlanet.type}</p>
              <p><span className="font-semibold">Distance:</span> {selectedPlanet.distance} light years</p>
              <p><span className="font-semibold">Radius:</span> {selectedPlanet.radius} Earth radii</p>
              <p><span className="font-semibold">Features:</span> {
                [
                  selectedPlanet.hasOceans && "Oceans",
                  selectedPlanet.hasLand && "Land",
                  selectedPlanet.hasClouds && "Clouds",
                  selectedPlanet.hasAtmosphere && "Atmosphere"
                ].filter(Boolean).join(", ")
              }</p>
            </div>
            <button
              onClick={() => setSelectedPlanet(null)}
              className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Close
            </button>
          </div>
        </Html>
      )}
    </>
  );
};

// Main Interactive Solar System Component
interface InteractiveSolarSystemProps {
  className?: string;
}

const InteractiveSolarSystem = ({ className = "" }: InteractiveSolarSystemProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          shadowMap: true
        }}
      >
        <SolarSystem />
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={5}
          maxDistance={25}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default InteractiveSolarSystem;
