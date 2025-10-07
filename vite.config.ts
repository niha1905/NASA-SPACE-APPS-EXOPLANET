import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Enable CORS for development
    cors: true,
    // Configure proxy if needed for API calls
    proxy: {
      // Proxy Exoplanet Archive to avoid CORS in development
      "/TAP": {
        target: "https://exoplanetarchive.ipac.caltech.edu",
        changeOrigin: true,
        secure: true,
        // Keep path as-is: /TAP/sync -> https://exoplanetarchive.ipac.caltech.edu/TAP/sync
        rewrite: (path) => path,
      },
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Fix for client-side routing
  base: "/",
  // Enable source maps for better debugging
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  // Configure HMR (Hot Module Replacement)
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
