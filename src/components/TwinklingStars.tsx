import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TwinklingStarsProps {
  count?: number;
  radius?: number;
  depth?: number;
  size?: number;
  speed?: number;
  color?: string;
}

const TwinklingStars: React.FC<TwinklingStarsProps> = ({
  count = 8000,
  radius = 100,
  depth = 50,
  size = 0.5,  // Smaller stars
  speed = 0.2,
  color = '#ffffff'
}) => {
  const starsRef = useRef<THREE.Points>(null);
  const twinkling = useRef<Float32Array>(new Float32Array(count));
  
  // Generate random positions for stars
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorObj = new THREE.Color(color);
    
    for (let i = 0; i < count; i++) {
      // Random position in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * radius;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random initial twinkling phase
      twinkling.current[i] = Math.random() * Math.PI * 2;
      
      // Slightly varied colors
      const brightness = 0.8 + Math.random() * 0.2;
      colors[i * 3] = colorObj.r * brightness;
      colors[i * 3 + 1] = colorObj.g * brightness;
      colors[i * 3 + 2] = colorObj.b * brightness;
    }
    
    return { positions, colors };
  }, [count, radius, color]);
  
  // Update twinkling effect
  useFrame(({ clock }) => {
    if (!starsRef.current) return;
    
    const time = clock.getElapsedTime();
    const sizes = starsRef.current.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Update twinkling phase
      twinkling.current[i] += speed * (0.5 + Math.random() * 0.5) * 0.01;
      
      // Calculate size based on sine wave for twinkling effect
      const twinkle = Math.sin(twinkling.current[i] + time) * 0.5 + 0.5;
      sizes[i] = size * (0.5 + twinkle * 0.5);
    }
    
    starsRef.current.geometry.attributes.size.needsUpdate = true;
  });
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={positions.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={new Float32Array(count).fill(size)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default TwinklingStars;