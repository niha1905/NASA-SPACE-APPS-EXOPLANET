import React, { useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { PlanetData } from "@/data/planetData";

interface PlanetProps {
  data: PlanetData;
}

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
      if (planetData.hasWater) {
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
          emissive: '#3E2723',
          roughness: 0.9,
          metalness: 0.05,
          secondaryColor: '#8B4513'
        };
      }
    default:
      return {
        color: '#808080',
        emissive: '#333333',
        roughness: 0.7,
        metalness: 0.3,
        secondaryColor: '#A9A9A9'
      };
  }
};

const Planet = React.memo(({ data }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const texture = useMemo(() => getPlanetTexture(data), [data]);

  useFrame(useCallback((state) => {
    const time = state.clock.getElapsedTime();
    
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
  }, []));

  const glowIntensity = data.probability * 2;

  return (
    <group ref={groupRef}>
      {/* Main Planet Sphere */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color={texture.color}
          emissive={texture.emissive}
          roughness={texture.roughness}
          metalness={texture.metalness}
        />
      </Sphere>

      {/* Cloud Layer */}
      {data.hasAtmosphere && (
        <Sphere ref={cloudRef} args={[1.01, 64, 64]}>
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            roughness={0.8}
            metalness={0.1}
          />
        </Sphere>
      )}

      {/* Water Layer */}
      {data.hasWater && (
        <Sphere ref={waterRef} args={[1.005, 64, 64]}>
          <meshStandardMaterial
            color="#1E90FF"
            transparent
            opacity={0.7}
            roughness={0.3}
            metalness={0.2}
          />
        </Sphere>
      )}

      {/* Atmospheric Glow */}
      <pointLight
        position={[0, 0, 0]}
        intensity={0.1}
        color={data.isHabitable ? "#87CEEB" : "#FF6B6B"}
        distance={2}
      />
    </group>
  );
});

Planet.displayName = 'Planet';

export default Planet;
