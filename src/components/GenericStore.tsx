import { useGesture } from "@use-gesture/react"
import { folder, useControls } from "leva"
import { createRef, MutableRefObject, useEffect } from "react"
import { Vector2 } from "three"
import { create } from "zustand"

interface IGenericStore {
  isTouchDevice: boolean
  mouseXYRef: MutableRefObject<Vector2 | null>
  mouseMoveXYRef: MutableRefObject<Vector2 | null>
  gestureBind: ReturnType<typeof useGesture> | null
  width: number
  height: number
  dpr: number
  canvasDomElement: HTMLCanvasElement | null
  effectsEnabled: boolean
  isFPSMeterVisible: boolean

  orbitControlsConfig: {
    enabled: boolean
    enableDamping: boolean
    dampingFactor: number
    enableZoom: boolean
    enableRotate: boolean
    enablePan: boolean
    minPolarAngle: number
    maxPolarAngle: number
    minAzimuthAngle: number
    maxAzimuthAngle: number
    minDistance: number
    maxDistance: number
  }
}

const mouseXYRef = createRef<Vector2 | null>() as MutableRefObject<Vector2 | null>
mouseXYRef.current = new Vector2()

const mouseMoveXYRef = createRef<Vector2 | null>() as MutableRefObject<Vector2 | null>
mouseMoveXYRef.current = new Vector2()

export const GenericStore = create<IGenericStore>(() => ({
  isTouchDevice: false,
  mouseXYRef,
  mouseMoveXYRef,
  gestureBind: null,
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: 1,
  canvasDomElement: null,
  effectsEnabled: true,
  isFPSMeterVisible: false,

  orbitControlsConfig: {
    enabled: false,
    enableDamping: true,
    dampingFactor: 0.2,
    enableZoom: true,
    enableRotate: true,
    enablePan: false,
    // 60 degrees
    minPolarAngle: Math.PI / 3,
    // 90 + 30 degrees
    maxPolarAngle: Math.PI / 2 + Math.PI / 9,
    minAzimuthAngle: -Math.PI / 6,
    maxAzimuthAngle: Math.PI / 6,
    minDistance: 0.1,
    maxDistance: 100,
  },
}))

const GenericStoreInit = () => {

  // Update `isTouchDevice` state when the user changes their device
  useEffect(() => {
    const handleMediaChange = (e: MediaQueryListEvent) => {
      GenericStore.setState({ 
        isTouchDevice: e.matches,
      })
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)')
    GenericStore.setState({ 
      isTouchDevice: mediaQuery.matches,
    })
    mediaQuery.addEventListener('change', handleMediaChange)

    // Clean up the listener when the component is unmounted
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // GenericStore.setState({ mouse: new Vector2(
      //   (e.pageX / window.innerWidth) * 2 - 1 , 
      //   -(e.pageY / window.innerHeight) * 2 + 1
      // )})
      GenericStore.getState().mouseXYRef.current?.set(
        (e.pageX / window.innerWidth) * 2 - 1,
        -(e.pageY / window.innerHeight) * 2 + 1
      )
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const bind = useGesture({
    onDrag: ({ xy }) => {
      GenericStore.getState().mouseXYRef.current?.set(
        (xy[0] / window.innerWidth) * 2 - 1,
        -(xy[1] / window.innerHeight) * 2 + 1
      )
    },
  })
  useEffect(() => {
    // GenericStore.setState({ gestureBind: bind })
  }, [bind])

  useEffect(() => {
    const handleResize = () => {
      GenericStore.setState({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useControls(
    'GenericStoreSettings',
    () => ({
      showFPSMeter: {
        value: GenericStore.getState().isFPSMeterVisible,
        onChange: (value: boolean) => {
          GenericStore.setState({ isFPSMeterVisible: value })
        }
      },
      'Orbit Controls': folder({
        enabled: {
          value: GenericStore.getState().orbitControlsConfig.enabled,
          onChange: (value: boolean) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, enabled: value } })
          }
        },
        enableDamping: {
          value: GenericStore.getState().orbitControlsConfig.enableDamping,
          onChange: (value: boolean) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, enableDamping: value } })
          }
        },
        dampingFactor: {
          value: GenericStore.getState().orbitControlsConfig.dampingFactor,
          min: 0.1,
          max: 1,
          step: 0.1,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, dampingFactor: value } })
          }
        },
        enableZoom: {
          value: GenericStore.getState().orbitControlsConfig.enableZoom,
          onChange: (value: boolean) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, enableZoom: value } })
          }
        },
        enableRotate: {
          value: GenericStore.getState().orbitControlsConfig.enableRotate,
          onChange: (value: boolean) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, enableRotate: value } })
          }
        },
        enablePan: {
          value: GenericStore.getState().orbitControlsConfig.enablePan,
          onChange: (value: boolean) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, enablePan: value } })
          }
        },
        minPolarAngle: {
          value: GenericStore.getState().orbitControlsConfig.minPolarAngle,
          min: 0,
          max: Math.PI,
          step: Math.PI / 4,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, minPolarAngle: value } })
          }
        },
        maxPolarAngle: {
          value: GenericStore.getState().orbitControlsConfig.maxPolarAngle,
          min: 0,
          max: Math.PI,
          step: Math.PI / 4,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, maxPolarAngle: value } })
          }
        },
        minAzimuthAngle: {
          value: GenericStore.getState().orbitControlsConfig.minAzimuthAngle,
          min: -Math.PI,
          max: Math.PI,
          step: Math.PI / 4,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, minAzimuthAngle: value } })
          }
        },
        maxAzimuthAngle: {
          value: GenericStore.getState().orbitControlsConfig.maxAzimuthAngle,
          min: -Math.PI,
          max: Math.PI,
          step: Math.PI / 4,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, maxAzimuthAngle: value } })
          }
        },
        minDistance: {
          value: GenericStore.getState().orbitControlsConfig.minDistance,
          min: 0,
          max: 100,
          step: 1,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, minDistance: value } })
          }
        },
        maxDistance: {
          value: GenericStore.getState().orbitControlsConfig.maxDistance,
          min: 0,
          max: 100,
          step: 1,
          onChange: (value: number) => {
            GenericStore.setState({ orbitControlsConfig: { ...GenericStore.getState().orbitControlsConfig, maxDistance: value } })
          }
        },
      }, 
      { collapsed: true }
    ),
      dpr: {
        value: GenericStore.getState().dpr,
        min: 0.1,
        max: 1,
        step: 0.1,
        onChange: (value: number) => {
          GenericStore.setState({ dpr: value })
        }
      },
    }),
    {
      collapsed: true,
    },
  )

  return <>
  </>
}


export default GenericStoreInit