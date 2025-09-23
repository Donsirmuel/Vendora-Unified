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
          // Simpler chunking: group all node_modules into a single vendor chunk.
          // This avoids cross-chunk circular imports where one vendor chunk
          // imports the React runtime from another vendor chunk and the
          // import alias can end up undefined at runtime in certain load orders.
          if (id.includes('node_modules')) {
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
