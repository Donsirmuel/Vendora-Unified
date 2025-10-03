import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  publicDir: 'public',
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          // Aggressive chunking to reduce memory usage during build
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('lucide-react')) return 'vendor-icons';
            // Bundle React and all React-dependent packages together to prevent
            // "Cannot read properties of undefined (reading 'createContext')" errors
            if (id.includes('react') || id.includes('react-dom') || 
                id.includes('@radix-ui') || id.includes('next-themes') || 
                id.includes('@tanstack/react-query')) return 'vendor-react';
            return 'vendor';
          }
          // Keep app chunks small
          if (id.includes('ChartsPanel')) return 'charts_panel';
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Reduce memory usage during build
    minify: 'esbuild',
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
