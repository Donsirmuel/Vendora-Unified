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
            // Keep recharts separate as it's large and only used in specific pages
            if (id.includes('recharts')) return 'vendor-recharts';
            // Bundle all other node_modules together to avoid circular dependencies
            // between chunks. Previously splitting into vendor-react and vendor
            // caused "Cannot access 'R' before initialization" errors.
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
