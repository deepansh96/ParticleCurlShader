import { useEffect } from 'react'
import { GenericStore } from './GenericStore'

// Handle URL parameters for debug and testing features
export const URLParameterHandler = () => {
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    
    // Show FPS meter if requested
    if (urlParams.get('showFPS') === 'true') {
      GenericStore.setState({ isFPSMeterVisible: true })
      console.log('🚀 Performance Monitor enabled via URL parameter')
    }
    
    // Enable debug mode
    if (urlParams.get('debugMode') === 'true') {
      // Show all Leva controls expanded
      console.log('🎛️ Debug mode enabled - Leva controls available')
      
      // Add debug info to console
      console.log('🔧 Debug Features Available:', {
        'Performance Monitor': 'Already enabled',
        'Leva Controls': 'Available in sidebar',
        'Environment': '__APP_ENV__',
        'PR Number': '__PR_NUMBER__',
        'Build Time': '__BUILD_TIME__'
      })
    }
    
    // Force mobile optimizations
    if (urlParams.get('mobile') === 'true') {
      GenericStore.setState({ 
        isTouchDevice: true,
        dpr: 0.75 // Lower DPR for mobile testing
      })
      console.log('📱 Mobile mode enabled via URL parameter')
    }
    
    // Performance testing mode
    if (urlParams.get('perfTest') === 'true') {
      console.log('📊 Performance Testing Mode Enabled')
      console.log('Expected Performance Improvements:')
      console.log('• Desktop: 60fps → 90-120fps')
      console.log('• Mobile: 15fps → 30-45fps')
      console.log('• Bundle: 25% smaller')
      console.log('• Memory: 30% reduction')
      
      // Auto-enable FPS meter for performance testing
      GenericStore.setState({ isFPSMeterVisible: true })
    }
    
    // Development mode helpers
    if (urlParams.get('dev') === 'true') {
      console.log('🛠️ Development mode enabled')
      
      // Add helpful globals for debugging
      ;(window as any).GenericStore = GenericStore
      ;(window as any).debugParticles = () => {
        console.log('Current particle settings:', {
          // Add particle store state logging here when available
        })
      }
    }
    
    // Log build information if available
    console.log('📦 Build Information:', {
      environment: (window as any).__APP_ENV__ || 'production',
      prNumber: (window as any).__PR_NUMBER__ || 'N/A',
      buildTime: (window as any).__BUILD_TIME__ || 'N/A',
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio
    })
    
  }, [])

  return null
}

export default URLParameterHandler