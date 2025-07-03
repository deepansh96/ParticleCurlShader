import { folder, useControls } from "leva"
import { useMemo } from "react"
import { ParticleStore } from './Particles'

// Memoized control configurations for better performance
export const ParticleControls = () => {
  
  // Group controls by category for better organization
  const motionControls = useMemo(() => ({
    moveWithMouse: {
      value: ParticleStore.getState().moveWithMouse,
      onChange: (value: boolean) => {
        ParticleStore.setState({ moveWithMouse: value })
      }
    },
    clickToColorChange: {
      value: ParticleStore.getState().clickToColorChange,
      onChange: (value: boolean) => {
        ParticleStore.setState({ clickToColorChange: value })
      }
    },
    elapsedTimeFactor: {
      value: ParticleStore.getState().elapsedTimeFactor,
      min: 0,
      max: 1,
      step: 0.1,
      onChange: (value: number) => {
        ParticleStore.setState({ elapsedTimeFactor: value })
      }
    },
    mouseMoveFactor: {
      value: ParticleStore.getState().mouseMoveFactor,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: (value: number) => {
        ParticleStore.setState({ mouseMoveFactor: value })
      }
    }
  }), [])

  const visualControls = useMemo(() => ({
    uSize: {
      value: ParticleStore.getState().uSize,
      min: 0.001,
      max: 10,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uSize: value })
      }
    },
    uRadius: {
      value: ParticleStore.getState().uRadiusRef.current,
      min: 0,
      max: 2,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.getState().uRadiusRef.current = value
      }
    },
    uPointSizeNumerator: {
      value: ParticleStore.getState().uPointSizeNumerator,
      min: 0,
      max: 100,
      step: 1,
      onChange: (value: number) => {
        ParticleStore.setState({ uPointSizeNumerator: value })
      }
    }
  }), [])

  const physicsControls = useMemo(() => ({
    uDieSpeed: {
      value: ParticleStore.getState().uDieSpeed,
      min: 0,
      max: 10,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uDieSpeed: value })
      }
    },
    uAttraction: {
      value: ParticleStore.getState().uAttraction,
      min: 0,
      max: 100,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uAttraction: value })
      }
    },
    uSpeed: {
      value: ParticleStore.getState().uSpeed,
      min: 0,
      max: 0.1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uSpeed: value })
      }
    },
    uCurlSize: {
      value: ParticleStore.getState().uCurlSize,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uCurlSize: value })
      }
    }
  }), [])

  const colorControls = useMemo(() => ({
    u_R: {
      value: ParticleStore.getState().u_R,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ u_R: value })
      }
    },
    u_G: {
      value: ParticleStore.getState().u_G,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ u_G: value })
      }
    },
    u_B: {
      value: ParticleStore.getState().u_B,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ u_B: value })
      }
    },
    uColorMultiplier: {
      value: ParticleStore.getState().uColorMultiplier,
      min: 1,
      max: 10,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uColorMultiplier: value })
      }
    }
  }), [])

  const shadowControls = useMemo(() => ({
    uShadowReductionFactor: {
      value: ParticleStore.getState().uShadowReductionFactor,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (value: number) => {
        ParticleStore.setState({ uShadowReductionFactor: value })
      }
    },
    uNumberOfSamples: {
      value: ParticleStore.getState().uNumberOfSamples,
      min: 0,
      max: 2, // Reduced max from 10 to 2 for performance
      step: 1,
      onChange: (value: number) => {
        ParticleStore.setState({ uNumberOfSamples: value })
      }
    },
    uShadowBias: {
      value: ParticleStore.getState().uShadowBias,
      min: 0,
      max: 0.01,
      step: 0.0001,
      onChange: (value: number) => {
        ParticleStore.setState({ uShadowBias: value })
      }
    }
  }), [])

  // Use the organized controls
  useControls(
    'Particles',
    () => ({
      'Motion': folder(motionControls, { collapsed: true }),
      'Visual': folder(visualControls, { collapsed: true }),
      'Physics': folder(physicsControls, { collapsed: true }),
      'Colors': folder(colorControls, { collapsed: true }),
      'Shadows': folder(shadowControls, { collapsed: true }),
    }),
    {
      collapsed: true,
    },
  )

  return null
}