import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-libs': ['lucide-react', '@tanstack/react-query', '@tanstack/react-table'],
          'form-libs': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'chart-libs': ['recharts'],
          'pdf-libs': ['@react-pdf/renderer', 'jspdf', 'html2canvas'],
          'pdfmake-libs': ['pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts'],
          'date-libs': ['date-fns'],
          'i18n': ['i18next', 'react-i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'esbuild',
  },
});
