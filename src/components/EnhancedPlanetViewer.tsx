import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Ring } from "@react-three/drei";
import * as THREE from "three";
import { PlanetData } from "@/data/planetData";

interface StarProps {
  position: [number, number, number];
  intensity: number;
}

const Star = ({ position, intensity }: StarProps) => {
  return (
    <pointLight
      position={position}
      intensity={intensity}
      color="#ffffff"
      distance={10}
    />
  );
};

interface OrbitalPathProps {
  radius: number;
  color: string;
}

const OrbitalPath = ({ radius, color }: OrbitalPathProps) => {
  const points = [];
  const segments = 64;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={new Float32Array(points)}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.3} />
    </line>
  );
};

interface HabitableZoneProps {
  innerRadius: number;
  outerRadius: number;
}

const HabitableZone = ({ innerRadius, outerRadius }: HabitableZoneProps) => {
  return (
    <group>
      {/* Inner boundary */}
      <Ring args={[innerRadius, innerRadius + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#4ade80" transparent opacity={0.2} />
      </Ring>
      {/* Outer boundary */}
      <Ring args={[outerRadius, outerRadius + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#4ade80" transparent opacity={0.2} />
      </Ring>
      {/* Zone fill */}
      <Ring args={[innerRadius, outerRadius]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#4ade80" transparent opacity={0.05} />
      </Ring>
    </group>
  );
};

interface PlanetProps {
  data: PlanetData;
  showOrbit?: boolean;
  showHabitableZone?: boolean;
}

const Planet = ({ data, showOrbit = true, showHabitableZone = true }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.003;
    }
  });

  const glowIntensity = data.probability * 2;
  const scale = hovered ? 1.1 : 1;

  return (
    <group>
      {/* Orbital path */}
      {showOrbit && (
        <OrbitalPath 
          radius={data.distanceFromStar * 2} 
          color={data.color} 
        />
      )}

      {/* Habitable zone indicator */}
      {showHabitableZone && data.isHabitable && (
        <HabitableZone 
          innerRadius={0.5} 
          outerRadius={1.5} 
        />
      )}

      {/* Planet positioned at orbital distance */}
      <group position={[data.distanceFromStar * 2, 0, 0]}>
        {/* Planet */}
        <Sphere 
          ref={meshRef} 
          args={[data.radius * 0.3, 64, 64]}
          scale={scale}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color={data.color}
            metalness={0.3}
            roughness={0.7}
            emissive={data.color}
            emissiveIntensity={0.2}
          />
        </Sphere>

        {/* Glow/Halo */}
        <Sphere ref={glowRef} args={[data.radius * 0.35, 32, 32]}>
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.15 * data.probability}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Atmosphere for planets with atmosphere */}
        {data.hasAtmosphere && (
          <Sphere args={[data.radius * 0.38, 32, 32]}>
            <meshPhongMaterial
              color="#88ccff"
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </Sphere>
        )}

        {/* Water indicators */}
        {data.hasWater && (
          <Sphere args={[data.radius * 0.32, 32, 32]}>
            <meshPhongMaterial
              color="#4ade80"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </Sphere>
        )}
      </group>
    </group>
  );
};

interface EnhancedPlanetViewerProps {
  planetData: PlanetData;
  showOrbit?: boolean;
  showHabitableZone?: boolean;
  showStarSystem?: boolean;
}

const EnhancedPlanetViewer = ({ 
  planetData, 
  showOrbit = true, 
  showHabitableZone = true,
  showStarSystem = true 
}: EnhancedPlanetViewerProps) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        {/* Central Star */}
        {showStarSystem && (
          <group>
            <Sphere args={[0.2, 32, 32]}>
              <meshBasicMaterial
                color="#ffd700"
                emissive="#ffd700"
                emissiveIntensity={0.5}
              />
            </Sphere>
            <Star position={[0, 0, 0]} intensity={2} />
          </group>
        )}

        {/* Planet with orbital system */}
        <Planet 
          data={planetData} 
          showOrbit={showOrbit}
          showHabitableZone={showHabitableZone}
        />

        {/* Ambient lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
};

export default EnhancedPlanetViewer;
