import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GenericStore } from './GenericStore'
import { ParticleStore } from './Particles'

interface QualitySettings {
  particleCount: number
  shadowSamples: number
  curlIterations: number
  effectsEnabled: boolean
  dpr: number
}

const QUALITY_PRESETS: { [key: string]: QualitySettings } = {
  low: {
    particleCount: 64,
    shadowSamples: 0,
    curlIterations: 1,
    effectsEnabled: false,
    dpr: 0.5
  },
  medium: {
    particleCount: 128,
    shadowSamples: 1,
    curlIterations: 2,
    effectsEnabled: true,
    dpr: 0.75
  },
  high: {
    particleCount: 256,
    shadowSamples: 2,
    curlIterations: 2,
    effectsEnabled: true,
    dpr: 1.0
  }
}

export const AdaptiveQuality = () => {
  const { gl } = useThree()
  const [currentQuality, setCurrentQuality] = useState<keyof typeof QUALITY_PRESETS>('medium')
  const fpsHistory = useRef<number[]>([])
  const lastCheck = useRef<number>(0)
  const frameCount = useRef<number>(0)

  // Detect device capabilities
  useEffect(() => {
    const isMobile = GenericStore.getState().isTouchDevice
    const isLowEnd = navigator.hardwareConcurrency <= 4
    const hasDiscrete = (gl as any).getParameter((gl as any).VERSION).includes('ANGLE')

    let initialQuality: keyof typeof QUALITY_PRESETS = 'medium'

    if (isMobile || isLowEnd) {
      initialQuality = 'low'
    } else if (!hasDiscrete) {
      initialQuality = 'medium'
    } else {
      initialQuality = 'high'
    }

    setCurrentQuality(initialQuality)
    applyQualitySettings(QUALITY_PRESETS[initialQuality])
  }, [gl])

  // Apply quality settings
  const applyQualitySettings = (settings: QualitySettings) => {
    // Update DPR
    GenericStore.setState({ dpr: settings.dpr })

    // Update shadow samples
    ParticleStore.setState({ uNumberOfSamples: settings.shadowSamples })

    // Update effects
    GenericStore.setState({ effectsEnabled: settings.effectsEnabled })

    console.log(`Applied ${currentQuality} quality settings:`, settings)
  }

  // Monitor performance and adjust quality
  useFrame((_, delta) => {
    frameCount.current++

    // Calculate FPS
    const fps = 1 / delta
    fpsHistory.current.push(fps)

    // Keep only last 60 frames
    if (fpsHistory.current.length > 60) {
      fpsHistory.current.shift()
    }

    // Check performance every 2 seconds
    const now = Date.now()
    if (now - lastCheck.current > 2000 && fpsHistory.current.length >= 30) {
      const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
      const minFps = Math.min(...fpsHistory.current)

      let newQuality = currentQuality

      // Downgrade quality if performance is poor
      if (avgFps < 30 || minFps < 20) {
        if (currentQuality === 'high') {
          newQuality = 'medium'
        } else if (currentQuality === 'medium') {
          newQuality = 'low'
        }
      }
      // Upgrade quality if performance is good and stable
      else if (avgFps > 55 && minFps > 45) {
        if (currentQuality === 'low') {
          newQuality = 'medium'
        } else if (currentQuality === 'medium') {
          newQuality = 'high'
        }
      }

      if (newQuality !== currentQuality) {
        setCurrentQuality(newQuality)
        applyQualitySettings(QUALITY_PRESETS[newQuality])
        console.log(`Quality adjusted to ${newQuality} (avg FPS: ${avgFps.toFixed(1)})`)
      }

      lastCheck.current = now
      fpsHistory.current = []
    }
  })

  return null
}