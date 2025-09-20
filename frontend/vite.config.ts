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
          if (id.includes('node_modules')) {
            // Split charting libraries into their own chunk
            if (id.includes('chart.js') || id.includes('recharts') || id.includes('apexcharts')) return 'vendor_charts';
            // UI libs vs utils — split larger dependencies so initial bundle is smaller
            if (id.includes('node_modules') && (id.includes('lodash') || id.includes('date-fns') || id.includes('dayjs'))) return 'vendor_utils';
            if (id.includes('node_modules') && (id.includes('@radix-ui') || id.includes('clsx') || id.includes('tailwind') || id.includes('shadcn'))) return 'vendor_ui';
            return 'vendor_core';
          }
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
