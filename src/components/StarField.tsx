import { useEffect, useRef } from 'react';

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.scale(dpr, dpr);
    };
    
    setCanvasSize();

    // Create dimmer stars
    const stars = [];
    const starCount = 800; // Keep the same number of stars
    
    for (let i = 0; i < starCount; i++) {
      const size = Math.random() * 2 + 0.5; // Smaller size range
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: size,
        alpha: Math.random() * 0.4 + 0.05, // Dimmer stars
        speed: Math.random() * 0.05 + 0.01 // Keep the same speed
      });
    }

    // Animation
    const animate = () => {
      // Clear with a darker background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw stars
      stars.forEach(star => {
        // Draw a simple star (faster than gradient)
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        
        // Add subtle glow effect for larger stars
        if (star.radius > 1.5) {
          const glow = star.radius * 1.2;
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, glow
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${star.alpha * 0.5})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.save();
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, glow, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
        
        // Move star
        star.y += star.speed;
        
        // Reset star if it goes off screen
        if (star.y > canvas.height + 20) {
          star.y = -20;
          star.x = Math.random() * canvas.width;
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Handle resize
    const handleResize = () => {
      setCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      backgroundColor: '#000000'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default StarField;
