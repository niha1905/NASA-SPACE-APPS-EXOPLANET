import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { AtmosphereShader, CloudShader, SurfaceShader } from '../shaders/AtmosphereShader';
import { PlanetData } from '../data/planetData';

interface EnhancedPlanetProps {
  planet: PlanetData;
  position: [number, number, number];
  scale?: number;
  onHover?: (hovering: boolean, planet: PlanetData) => void;
}

/**
 * EnhancedPlanet Component
 * A photorealistic planet with three layers:
 * 1. Surface - Core sphere with PBR materials
 * 2. Clouds - Semi-transparent cloud layer
 * 3. Atmosphere - Outer glow using custom Fresnel shader
 */
export const EnhancedPlanet: React.FC<EnhancedPlanetProps> = ({
  planet,
  position,
  scale = 1,
  onHover
}) => {
  // References for the three layers
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Load textures if available
  const textures = useLoadPlanetTextures(planet);
  
  // Create materials for each layer
  const surfaceMaterial = useSurfaceMaterial(planet, textures);
  const cloudsMaterial = useCloudsMaterial(planet, textures);
  const atmosphereMaterial = useAtmosphereMaterial(planet);
  
  // Handle hover events
  const handlePointerOver = () => onHover && onHover(true, planet);
  const handlePointerOut = () => onHover && onHover(false, planet);
  
  // Animation loop
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Update time uniform for all shaders
    if (surfaceMaterial && 'uniforms' in surfaceMaterial) {
      surfaceMaterial.uniforms.time.value = time;
    }
    
    if (cloudsMaterial && 'uniforms' in cloudsMaterial) {
      cloudsMaterial.uniforms.time.value = time;
    }
    
    if (atmosphereMaterial && 'uniforms' in atmosphereMaterial) {
      atmosphereMaterial.uniforms.time.value = time;
    }
    
    // Rotate each layer at different speeds
    if (surfaceRef.current) {
      // If tidally locked, only rotate slightly to simulate libration
      if (planet.isTidallyLocked) {
        surfaceRef.current.rotation.y = Math.sin(time * 0.05) * 0.02;
      } else {
        const rotationSpeed = planet.rotationSpeed || 0.01;
        surfaceRef.current.rotation.y += rotationSpeed;
      }
    }
    
    if (cloudsRef.current && planet.hasClouds) {
      const cloudSpeed = planet.cloudRotationSpeed || 0.015;
      cloudsRef.current.rotation.y += cloudSpeed;
    }
    
    if (atmosphereRef.current) {
      const atmosphereSpeed = planet.atmosphereRotationSpeed || 0.005;
      atmosphereRef.current.rotation.y += atmosphereSpeed;
    }
  });
  
  return (
    <group 
      ref={groupRef} 
      position={position} 
      scale={scale}
      frustumCulled={false}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Surface layer */}
      <mesh ref={surfaceRef}>
        <sphereGeometry args={[1, 64, 64]} />
          {surfaceMaterial ? (
            <primitive object={surfaceMaterial} attach="material" />
          ) : (
            // Fallback material so planet is visible immediately while shader initializes
            <meshStandardMaterial
              attach="material"
              color={planet.color}
              roughness={0.8}
              metalness={0.0}
            />
          )}
      </mesh>
      
      {/* Cloud layer - only if planet has clouds */}
      {planet.hasClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[1.01, 64, 64]} />
          {cloudsMaterial && <primitive object={cloudsMaterial} attach="material" />}
        </mesh>
      )}
      
      {/* Atmosphere layer - only if planet has atmosphere */}
      {planet.hasAtmosphere && (
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[1.05, 64, 64]} />
          {atmosphereMaterial && <primitive object={atmosphereMaterial} attach="material" />}
        </mesh>
      )}
    </group>
  );
};

/**
 * Hook to load planet textures
 */
function useLoadPlanetTextures(planet: PlanetData) {
  // Load textures if paths are provided
  const textures = {
    surface: planet.surfaceTexture ? useLoader(THREE.TextureLoader, planet.surfaceTexture) : null,
    normal: planet.normalMapTexture ? useLoader(THREE.TextureLoader, planet.normalMapTexture) : null,
    roughness: planet.roughnessMapTexture ? useLoader(THREE.TextureLoader, planet.roughnessMapTexture) : null,
    clouds: planet.cloudTexture ? useLoader(THREE.TextureLoader, planet.cloudTexture) : null,
  };
  
  return textures;
}

/**
 * Hook to create surface material
 */
function useSurfaceMaterial(planet: PlanetData, textures: any) {
  const material = useRef<THREE.ShaderMaterial | null>(null);
  
  useEffect(() => {
    // Create shader material for surface
    const surfaceMat = new THREE.ShaderMaterial({
      ...SurfaceShader,
      transparent: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      uniforms: {
        ...SurfaceShader.uniforms,
        color: { value: new THREE.Color(planet.color) },
        secondaryColor: { value: new THREE.Color(planet.hasLand ? '#228B22' : planet.color) },
        normalMap: { value: textures.normal },
        roughnessMap: { value: textures.roughness },
        hasNormalMap: { value: textures.normal ? 1.0 : 0.0 },
        hasRoughnessMap: { value: textures.roughness ? 1.0 : 0.0 },
        hasWater: { value: planet.hasWater },
        waterLevel: { value: planet.hasWater ? 0.4 : 0 },
        time: { value: 0 },
        // Use provided emissiveColor and give a stronger glow for habitable worlds
        emissive: { value: new THREE.Color(planet.emissiveColor || (planet.isTidallyLocked ? '#FF4500' : '#000000')) },
        emissiveIntensity: { value: planet.isHabitable ? 0.6 : (planet.isTidallyLocked ? 0.2 : 0) }
      }
    });
    
    material.current = surfaceMat;
    
    return () => {
      surfaceMat.dispose();
    };
  }, [planet, textures]);
  
  return material.current;
}

/**
 * Hook to create clouds material
 */
function useCloudsMaterial(planet: PlanetData, textures: any) {
  const material = useRef<THREE.ShaderMaterial | null>(null);
  
  useEffect(() => {
    if (!planet.hasClouds) return;
    
    // Create shader material for clouds
    const cloudsMat = new THREE.ShaderMaterial({
      ...CloudShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        ...CloudShader.uniforms,
        color: { value: new THREE.Color(0xFFFFFF) },
        opacity: { value: planet.hasIce ? 0.7 : 0.6 },
        time: { value: 0 },
        cloudTexture: { value: textures.clouds },
        hasCloudTexture: { value: textures.clouds ? 1.0 : 0.0 }
      }
    });
    
    material.current = cloudsMat;
    
    return () => {
      cloudsMat.dispose();
    };
  }, [planet, textures]);
  
  return material.current;
}

/**
 * Hook to create atmosphere material
 */
function useAtmosphereMaterial(planet: PlanetData) {
  const material = useRef<THREE.ShaderMaterial | null>(null);
  
  useEffect(() => {
    if (!planet.hasAtmosphere) return;
    
    // Create shader material for atmosphere
    const atmosphereMat = new THREE.ShaderMaterial({
      ...AtmosphereShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        ...AtmosphereShader.uniforms,
        color: { value: new THREE.Color(planet.atmosphereColor || '#87CEEB') },
        opacity: { value: planet.atmosphereOpacity || 0.3 },
        glowPower: { value: 2.0 },
        glowStrength: { value: 1.5 },
        time: { value: 0 },
        atmosphereThickness: { value: 0.1 }
      }
    });
    
    material.current = atmosphereMat;
    
    return () => {
      atmosphereMat.dispose();
    };
  }, [planet]);
  
  return material.current;
}