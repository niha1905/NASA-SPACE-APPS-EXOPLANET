import * as THREE from 'three';

/**
 * Custom Atmosphere Shader with Fresnel effect
 * Creates a realistic atmospheric glow around planets
 */
export const AtmosphereShader = {
  uniforms: {
    color: { value: new THREE.Color(0x87CEEB) },
    opacity: { value: 0.3 },
    glowPower: { value: 2.0 },
    glowStrength: { value: 1.5 },
    time: { value: 0.0 },
    atmosphereThickness: { value: 0.1 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -modelViewPosition.xyz;
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    uniform float glowPower;
    uniform float glowStrength;
    uniform float time;
    uniform float atmosphereThickness;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
      // Calculate view direction
      vec3 viewDir = normalize(vViewPosition);
      
      // Calculate fresnel effect (stronger at edges, weaker at center)
      float fresnel = pow(1.0 - dot(vNormal, viewDir), glowPower);
      
      // Add some subtle variation based on time
      float timeVariation = sin(time * 0.1 + vUv.x * 10.0) * 0.05 + 0.95;
      
      // Calculate final intensity
      float intensity = fresnel * glowStrength * timeVariation;
      
      // Apply atmosphere thickness
      intensity *= atmosphereThickness;
      
      // Create the final color with opacity
      vec4 finalColor = vec4(color, intensity * opacity);
      
      gl_FragColor = finalColor;
    }
  `
};

/**
 * Custom Cloud Shader
 * Creates realistic cloud patterns with movement
 */
export const CloudShader = {
  uniforms: {
    color: { value: new THREE.Color(0xFFFFFF) },
    opacity: { value: 0.6 },
    time: { value: 0.0 },
    cloudTexture: { value: null },
    hasCloudTexture: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float opacity;
    uniform float time;
    uniform sampler2D cloudTexture;
    uniform float hasCloudTexture;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      // Create moving cloud effect
      vec2 uv = vUv;
      uv.x += time * 0.01;
      
      // Sample cloud texture if available, otherwise create procedural clouds
      vec4 cloudColor;
      if (hasCloudTexture > 0.5) {
        cloudColor = texture2D(cloudTexture, uv);
      } else {
        // Simple procedural cloud pattern
        float noise = sin(uv.x * 10.0) * sin(uv.y * 10.0) * 0.5 + 0.5;
        noise += sin(uv.x * 20.0 + time * 0.1) * sin(uv.y * 20.0 + time * 0.05) * 0.25;
        cloudColor = vec4(vec3(noise), 1.0);
      }
      
      // Apply cloud color and opacity
      vec4 finalColor = vec4(color * cloudColor.rgb, cloudColor.a * opacity);
      
      // Make clouds thinner at poles
      float polarFade = abs(vNormal.y);
      finalColor.a *= (1.0 - polarFade * 0.8);
      
      gl_FragColor = finalColor;
    }
  `
};

/**
 * Custom Surface Shader
 * Creates realistic planet surfaces with normal mapping and detail
 */
export const SurfaceShader = {
  uniforms: {
    color: { value: new THREE.Color(0x1E90FF) },
    secondaryColor: { value: new THREE.Color(0x228B22) },
    normalMap: { value: null },
    roughnessMap: { value: null },
    hasNormalMap: { value: 0.0 },
    hasRoughnessMap: { value: 0.0 },
    hasWater: { value: false },
    waterLevel: { value: 0.4 },
    time: { value: 0.0 },
    emissive: { value: new THREE.Color(0x000000) },
    emissiveIntensity: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform vec3 secondaryColor;
    uniform sampler2D normalMap;
    uniform sampler2D roughnessMap;
    uniform float hasNormalMap;
    uniform float hasRoughnessMap;
    uniform bool hasWater;
    uniform float waterLevel;
    uniform float time;
    uniform vec3 emissive;
    uniform float emissiveIntensity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      // Base color
      vec3 baseColor = color;
      
      // Apply normal mapping if available
      vec3 normal = vNormal;
      if (hasNormalMap > 0.5) {
        vec3 normalValue = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
        normal = normalize(normal + normalValue * 0.5);
      }
      
      // Apply roughness if available
      float roughness = 0.5;
      if (hasRoughnessMap > 0.5) {
        roughness = texture2D(roughnessMap, vUv).r;
      }
      
      // Create land/water patterns
      if (hasWater) {
        // Simple noise function for terrain
        float noise = sin(vUv.x * 20.0) * sin(vUv.y * 20.0) * 0.5 + 0.5;
        noise += sin(vUv.x * 40.0) * sin(vUv.y * 40.0) * 0.25;
        
        // Mix between water and land based on noise
        if (noise < waterLevel) {
          baseColor = color; // Water color
        } else {
          baseColor = secondaryColor; // Land color
          
          // Add some height variation to land
          float landHeight = (noise - waterLevel) / (1.0 - waterLevel);
          baseColor = mix(secondaryColor, secondaryColor * 1.2, landHeight);
        }
      }
      
      // Add some variation based on latitude (poles vs equator)
      float latitude = abs(vNormal.y);
      if (latitude > 0.8 && hasWater) {
        // Ice caps at poles
        baseColor = mix(baseColor, vec3(0.9, 0.95, 1.0), (latitude - 0.8) * 5.0);
      }
      
      // Add emissive glow (for lava, city lights, etc)
      vec3 finalColor = baseColor + emissive * emissiveIntensity;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};