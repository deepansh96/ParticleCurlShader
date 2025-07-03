import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import glsl from 'vite-plugin-glsl'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine base URL based on environment
  let base = '/ParticleCurlShader/'
  
  if (env.VITE_APP_ENV === 'staging') {
    base = `/ParticleCurlShader-staging/pr-${env.VITE_PR_NUMBER}/`
  } else if (env.PUBLIC_URL) {
    base = env.PUBLIC_URL
  }

  return {
    plugins: [
      react(),
      glsl()
    ],
    base,
    
    // Environment variables
    define: {
      __APP_ENV__: JSON.stringify(process.env.VITE_APP_ENV || 'production'),
      __PR_NUMBER__: JSON.stringify(process.env.VITE_PR_NUMBER || ''),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    
    // Performance optimizations
    build: {
      // Enable tree shaking
      minify: 'esbuild',
      
      // Optimize chunk sizes
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor libraries
            'three': ['three'],
            'react-three': ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
            'react-vendor': ['react', 'react-dom'],
            'ui-libs': ['leva', '@react-spring/web', 'zustand']
          },
          
          // Optimize chunk loading
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      
      // Target modern browsers for better optimization
      target: 'es2020',
      
      // Increase chunk size warning limit for 3D assets
      chunkSizeWarningLimit: 1000,
      
      // Add source maps for staging
      sourcemap: process.env.VITE_APP_ENV === 'staging'
    },
    
    // Optimize development experience
    server: {
      // Enable hot reload for shaders
      hmr: {
        overlay: false
      }
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'zustand'
      ],
      exclude: [
        // Exclude large libraries that don't need pre-bundling
        'three/examples/jsm/misc/GPUComputationRenderer.js'
      ]
    }
  }
})
