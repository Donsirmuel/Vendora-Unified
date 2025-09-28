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
            // Group all node_modules into a single vendor chunk to avoid
            // cross-chunk circular dependencies (React + other libs).
            // This simplifies bundling and prevents runtime import/init races.
            // Place some very large libraries into their own chunks so they
            // don't inflate the main vendor bundle. Keep React/runtime in
            // vendor to avoid cross-chunk initialization problems.
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('lucide-react')) return 'vendor-icons';
              return 'vendor';
            }

            // Keep some app-specific chunks separate (optional)
            if (id.includes('ChartsPanel')) return 'charts_panel';
          }
      }
    },
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
