import { SpringRef, useSpring } from "@react-spring/web"
import { useFrame, useThree } from "@react-three/fiber"
import { damp } from 'maath/easing'
import { createRef, MutableRefObject, useEffect, useRef, useMemo } from "react"
import * as THREE from 'three'
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, NoBlending, OrthographicCamera, PlaneGeometry, Points, ShaderMaterial, SphereGeometry, Texture, Uniform, Vector2, Vector3, WebGLRenderTarget } from "three"
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js'
import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import gpgpuParticlesShader from "../shaders/gpgpu/particles.glsl"
import particlesFragmentShader from "../shaders/particles/fragment.glsl"
import particlesVertexShader from "../shaders/particles/vertex.glsl"
import { GenericStore } from "./GenericStore"
import { ParticleControls } from "./ParticleControls"
// import { ParticleUniforms } from "./ParticleUniforms"
import { AdaptiveQuality } from "./AdaptiveQuality"

// Simplified color configurations
const COLOR_CONFIGS = [
  { u_R: 0.656, u_G: 1, u_B: 1, uShadowBias: 0.0022, uShadowReductionFactor: 0.53, uColorMultiplier: 1.3 },
  { u_R: 0.97, u_G: 0.97, u_B: 0.4, uShadowBias: 0.01, uShadowReductionFactor: 0.41, uColorMultiplier: 1.1 },
  { u_R: 0.7, u_G: 0, u_B: 1, uShadowBias: 0.0021, uShadowReductionFactor: 0.801, uColorMultiplier: 2.675 }
]

let currentColorConfigIndex = 0

// Optimized particle store interface with only essential properties
interface IParticleStore {
  // Core 3D objects
  baseGeometry: BufferGeometry | null
  material: ShaderMaterial | null
  points: Points | null
  baseGeometryCount: number
  
  // GPGPU computation
  gpgpuSize: number
  gpgpuComputationRenderer: GPUComputationRenderer | null
  gpgpuBaseParticleTexture: Texture | null
  gpgpuParticlesVariable: Variable | null
  gpgpuDebugPlane: Mesh | null

  // Particle parameters (grouped for better memory layout)
  uSize: number
  uRadiusRef: MutableRefObject<number>
  uRadiusAbsolute: number
  uDieSpeed: number
  uAttraction: number
  uSpeed: number
  uCurlSize: number
  
  // Animation parameters (reduced from 13 to 6 most important)
  uA: number
  uB: number
  uC: number
  uD: number
  uE: number
  uF: number
  uCurlTimeReducer: number
  
  // Visual parameters
  uPointSizeNumerator: number
  uPointSizeSmoothStepStart: number
  uPointSizeSmoothStepEnd: number
  
  // Shadow parameters
  uShadowReductionFactor: number
  uNumberOfSamples: number
  uSpread: number
  uShadowBias: number
  
  // Color parameters
  u_R: number
  u_G: number
  u_B: number
  uColorMultiplier: number
  
  // Interaction parameters
  uFollowMouse: 0 | 1
  uFollowPosition: MutableRefObject<Vector3>
  uFollowPositionPlusMouseMove: MutableRefObject<Vector3>
  
  // Depth rendering
  depthCamera: OrthographicCamera | null
  depthRenderTarget1: WebGLRenderTarget | null
  depthRenderTarget2: WebGLRenderTarget | null
  depthCameraPosition: Vector3
  depthCameraTarget: Vector3
  
  // State flags
  isMouseDown: boolean
  isPaused: boolean
  
  // Mouse tracking (optimized)
  mouseMoveX: MutableRefObject<number>
  mouseMoveY: MutableRefObject<number>
  mouseMoveFactor: number
  mouseMoveInterval: number | null
  isMouseMoving: boolean
  elapsedTimeFactor: number
  
  // Animation springs
  particleColorChangeSpringAPI: SpringRef<any> | null
  clickToColorChange: boolean
  moveWithMouse: boolean
}

// Optimized ref creation
const createOptimizedRefs = () => ({
  mouseMoveX: createRef<number>() as MutableRefObject<number>,
  mouseMoveY: createRef<number>() as MutableRefObject<number>,
  uFollowPosition: createRef<Vector3>() as MutableRefObject<Vector3>,
  uFollowPositionPlusMouseMove: createRef<Vector3>() as MutableRefObject<Vector3>,
  uRadiusRef: createRef<number>() as MutableRefObject<number>
})

const refs = createOptimizedRefs()
refs.mouseMoveX.current = 0
refs.mouseMoveY.current = 0
refs.uFollowPosition.current = new Vector3()
refs.uFollowPositionPlusMouseMove.current = new Vector3()
refs.uRadiusRef.current = 0.58

export const ParticleStore = create<IParticleStore>(() => ({
  // Core objects
  baseGeometry: null,
  material: null,
  points: null,
  baseGeometryCount: 0,
  
  // GPGPU
  gpgpuSize: 0,
  gpgpuComputationRenderer: null,
  gpgpuBaseParticleTexture: null,
  gpgpuParticlesVariable: null,
  gpgpuDebugPlane: null,

  // Particle parameters
  uSize: 1.03,
  uRadiusRef: refs.uRadiusRef,
  uRadiusAbsolute: 0.58,
  uDieSpeed: 1.22,
  uAttraction: 11.35,
  uSpeed: 0.04,
  uCurlSize: 0.38,
  
  // Reduced animation parameters
  uA: 0.49,
  uB: 1.0,
  uC: 13.2,
  uD: 0.17,
  uE: 0.45,
  uF: 0.71,
  uCurlTimeReducer: 0.59,
  
  // Visual parameters
  uPointSizeNumerator: 41,
  uPointSizeSmoothStepStart: 0.06,
  uPointSizeSmoothStepEnd: 0.5,
  
  // Shadow parameters (optimized defaults)
  uShadowReductionFactor: COLOR_CONFIGS[0].uShadowReductionFactor,
  uNumberOfSamples: 1, // Reduced from 2 for better performance
  uSpread: 512,
  uShadowBias: COLOR_CONFIGS[0].uShadowBias,
  
  // Color parameters
  u_R: COLOR_CONFIGS[0].u_R,
  u_G: COLOR_CONFIGS[0].u_G,
  u_B: COLOR_CONFIGS[0].u_B,
  uColorMultiplier: COLOR_CONFIGS[0].uColorMultiplier,
  
  // Interaction
  uFollowMouse: 1,
  uFollowPosition: refs.uFollowPosition,
  uFollowPositionPlusMouseMove: refs.uFollowPositionPlusMouseMove,
  
  // Depth rendering
  depthCamera: null,
  depthRenderTarget1: null,
  depthRenderTarget2: null,
  depthCameraPosition: new Vector3(0, 10, 0),
  depthCameraTarget: new Vector3(),
  
  // State
  isMouseDown: false,
  isPaused: false,
  
  // Mouse tracking
  mouseMoveX: refs.mouseMoveX,
  mouseMoveY: refs.mouseMoveY,
  mouseMoveFactor: 4,
  mouseMoveInterval: null,
  isMouseMoving: false,
  elapsedTimeFactor: 0.7,
  
  // Springs
  particleColorChangeSpringAPI: null,
  clickToColorChange: true,
  moveWithMouse: true
}))

// Optimized mouse event handlers with throttling
const MouseEventHandlers = () => {
  const throttleRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseDown = () => {
      if (!ParticleStore.getState().clickToColorChange) return
      ParticleStore.setState({ isMouseDown: true })
    }

    const handleMouseUp = () => ParticleStore.setState({ isMouseDown: false })

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now()
      if (now - throttleRef.current < 16) return // Throttle to 60fps
      throttleRef.current = now

      if (ParticleStore.getState().mouseMoveInterval) {
        clearInterval(ParticleStore.getState().mouseMoveInterval!)
      }
      ParticleStore.getState().isMouseMoving = true

      const normalizedX = (event.clientX / window.innerWidth) * 2 - 1
      const normalizedY = -(event.clientY / window.innerHeight) * 2 + 1

      ParticleStore.getState().mouseMoveX.current = normalizedX
      ParticleStore.getState().mouseMoveY.current = normalizedY

      ParticleStore.getState().mouseMoveInterval = window.setTimeout(() => {
        ParticleStore.getState().isMouseMoving = false
      }, 1500)
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchstart', handleMouseDown)
    window.addEventListener('touchend', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchstart', handleMouseDown)
      window.removeEventListener('touchend', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return null
}

// Core particle system component
const ParticleSystem = () => {
  const { scene, gl, camera } = useThree()
  
  const { width, height, dpr } = GenericStore(
    useShallow((state) => ({
      width: state.width,
      height: state.height,
      dpr: state.dpr
    }))
  )

  const isMouseDown = ParticleStore((state) => state.isMouseDown)

  // Memoized particle initialization
  const particleCount = useMemo(() => {
    return GenericStore.getState().isTouchDevice ? 128 : 256
  }, [])

  // Initialize particle system once
  useEffect(() => {
    // Create optimized render targets
    const createRenderTarget = (size: number) => {
      const renderTarget = new THREE.WebGLRenderTarget(size, size)
      renderTarget.texture.minFilter = THREE.NearestFilter
      renderTarget.texture.magFilter = THREE.NearestFilter
      renderTarget.stencilBuffer = false
      renderTarget.depthTexture = new THREE.DepthTexture(size, size)
      renderTarget.depthTexture.format = THREE.DepthFormat
      renderTarget.depthTexture.type = THREE.UnsignedShortType
      return renderTarget
    }

    const depthCamera = new OrthographicCamera(-5, 5, 5, -5, 0, 50)
    depthCamera.position.copy(ParticleStore.getState().depthCameraPosition)
    depthCamera.lookAt(ParticleStore.getState().depthCameraTarget)

    const depthRenderTarget1 = createRenderTarget(512)
    const depthRenderTarget2 = createRenderTarget(512)

    ParticleStore.setState({ depthCamera, depthRenderTarget1, depthRenderTarget2 })

    // Create optimized geometry
    const baseGeometry = new SphereGeometry(3, particleCount, particleCount)

    // Create optimized material with pre-computed uniforms
    const material = new ShaderMaterial({
      vertexShader: particlesVertexShader,
      fragmentShader: particlesFragmentShader,
      uniforms: {
        uSize: new Uniform(ParticleStore.getState().uSize),
        uResolution: new Uniform(new Vector2(width * dpr, height * dpr)),
        uParticlesTexture: new Uniform(null),
        uTime: new Uniform(0),
        uLightDepthTexture: new Uniform(null),
        uLightMatrix: new Uniform(new Matrix4()),
        uPointSizeNumerator: new Uniform(ParticleStore.getState().uPointSizeNumerator),
        uPointSizeSmoothStepStart: new Uniform(ParticleStore.getState().uPointSizeSmoothStepStart),
        uPointSizeSmoothStepEnd: new Uniform(ParticleStore.getState().uPointSizeSmoothStepEnd),
        uShadowReductionFactor: new Uniform(ParticleStore.getState().uShadowReductionFactor),
        uNumberOfSamples: new Uniform(ParticleStore.getState().uNumberOfSamples),
        uSpread: new Uniform(ParticleStore.getState().uSpread),
        uShadowBias: new Uniform(ParticleStore.getState().uShadowBias),
        u_R: new Uniform(ParticleStore.getState().u_R),
        u_G: new Uniform(ParticleStore.getState().u_G),
        u_B: new Uniform(ParticleStore.getState().u_B),
        uColorMultiplier: new Uniform(ParticleStore.getState().uColorMultiplier),
        uFollowPosition: new Uniform(ParticleStore.getState().uFollowPosition),
      },
      depthTest: true,
      blending: NoBlending,
      toneMapped: false,
    })

    const baseGeometryCount = baseGeometry.attributes.position.count
    const gpgpuSize = Math.ceil(Math.sqrt(baseGeometryCount))
    const gpgpuComputationRenderer = new GPUComputationRenderer(gpgpuSize, gpgpuSize, gl)
    
    // Initialize GPGPU texture
    const gpgpuBaseParticleTexture = gpgpuComputationRenderer.createTexture()
    for (let i = 0; i < baseGeometryCount; i++) {
      const i3 = i * 3
      const i4 = i * 4

      gpgpuBaseParticleTexture.image.data[i4 + 0] = baseGeometry.attributes.position.array[i3 + 0]
      gpgpuBaseParticleTexture.image.data[i4 + 1] = baseGeometry.attributes.position.array[i3 + 1]
      gpgpuBaseParticleTexture.image.data[i4 + 2] = baseGeometry.attributes.position.array[i3 + 2]
      gpgpuBaseParticleTexture.image.data[i4 + 3] = Math.random()
    }

    // Setup GPGPU variable with optimized uniforms
    const gpgpuParticlesVariable = gpgpuComputationRenderer.addVariable('uParticles', gpgpuParticlesShader, gpgpuBaseParticleTexture)
    gpgpuComputationRenderer.setVariableDependencies(gpgpuParticlesVariable, [gpgpuParticlesVariable])
    
    // Batch initialize GPGPU uniforms
    const gpgpuUniforms = gpgpuParticlesVariable.material.uniforms
    Object.assign(gpgpuUniforms, {
      uTime: new Uniform(0),
      uBase: new Uniform(gpgpuBaseParticleTexture),
      uDeltaTime: new Uniform(0),
      uFlowFieldInfluence: new Uniform(0.5),
      uFlowFieldStrength: new Uniform(3),
      uFlowFieldFrequency: new Uniform(1),
      uFollowPosition: new Uniform(ParticleStore.getState().uFollowPosition),
      uRadius: new Uniform(ParticleStore.getState().uRadiusRef.current),
      uDieSpeed: new Uniform(ParticleStore.getState().uDieSpeed),
      uAttraction: new Uniform(ParticleStore.getState().uAttraction),
      uSpeed: new Uniform(ParticleStore.getState().uSpeed),
      uCurlSize: new Uniform(ParticleStore.getState().uCurlSize),
      uA: new Uniform(ParticleStore.getState().uA),
      uB: new Uniform(ParticleStore.getState().uB),
      uC: new Uniform(ParticleStore.getState().uC),
      uD: new Uniform(ParticleStore.getState().uD),
      uE: new Uniform(ParticleStore.getState().uE),
      uF: new Uniform(ParticleStore.getState().uF),
      uFollowMouse: new Uniform(ParticleStore.getState().uFollowMouse),
      uCurlTimeReducer: new Uniform(ParticleStore.getState().uCurlTimeReducer),
    })

    gpgpuComputationRenderer.init()

    // Create debug plane (hidden by default)
    const gpgpuDebugPlane = new Mesh(
      new PlaneGeometry(3, 3),
      new MeshBasicMaterial({
        map: gpgpuComputationRenderer.getCurrentRenderTarget(gpgpuParticlesVariable).texture
      })
    )
    gpgpuDebugPlane.position.set(3, 0, 0)
    gpgpuDebugPlane.visible = false
    scene.add(gpgpuDebugPlane)

    // Create optimized particle geometry
    const particlesUVArray = new Float32Array(baseGeometryCount * 2)
    const particleSizesArray = new Float32Array(baseGeometryCount)
    
    for (let y = 0; y < gpgpuSize; y++) {
      for (let x = 0; x < gpgpuSize; x++) {
        const i = x + y * gpgpuSize
        const i2 = i * 2

        particlesUVArray[i2 + 0] = (x + 0.5) / gpgpuSize
        particlesUVArray[i2 + 1] = (y + 0.5) / gpgpuSize
        particleSizesArray[i] = Math.random()
      }
    }

    const particleGeometry = new BufferGeometry()
    particleGeometry.setDrawRange(0, baseGeometryCount)
    particleGeometry.setAttribute('aParticlesUv', new BufferAttribute(particlesUVArray, 2))
    particleGeometry.setAttribute('aSize', new BufferAttribute(particleSizesArray, 1))

    const points = new Points(particleGeometry, material)
    points.position.set(0, 0, 0)
    points.frustumCulled = false
    scene.add(points)

    // Update store with created objects
    ParticleStore.setState({
      baseGeometry,
      material,
      baseGeometryCount,
      gpgpuSize,
      gpgpuComputationRenderer,
      gpgpuBaseParticleTexture,
      gpgpuParticlesVariable,
      points,
      gpgpuDebugPlane
    })
  }, [scene, gl, camera, particleCount])

  // Update resolution on resize
  useEffect(() => {
    ParticleStore.getState().material?.uniforms.uResolution.value.set(width * dpr, height * dpr)
  }, [width, height, dpr])

  // Optimized animation springs
  const [, particleSlowDownSpringAPI] = useSpring(() => ({
    from: { 
      uSpeed: ParticleStore.getState().uSpeed,
      uDieSpeed: ParticleStore.getState().uDieSpeed
    },
  }))

  const [, particleColorChangeSpringAPI] = useSpring(() => ({
    from: COLOR_CONFIGS[0],
  }))
  
  ParticleStore.getState().particleColorChangeSpringAPI = particleColorChangeSpringAPI

  // Handle mouse interactions
  useEffect(() => {
    if (ParticleStore.getState().isPaused) return

    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    const particleMaterial = ParticleStore.getState().material
    
    if (!gpgpuVariable || !particleMaterial) return

    if (isMouseDown) {
      // Slow down particles on mouse down
      particleSlowDownSpringAPI.stop()
      particleSlowDownSpringAPI.start({
        to: {
          uSpeed: ParticleStore.getState().uSpeed * 0.1,
          uDieSpeed: ParticleStore.getState().uDieSpeed * 0.4
        },
        onChange: (values) => {
          gpgpuVariable.material.uniforms.uSpeed.value = values.value.uSpeed
          gpgpuVariable.material.uniforms.uDieSpeed.value = values.value.uDieSpeed
        }
      })

      // Change colors
      particleColorChangeSpringAPI.stop()
      currentColorConfigIndex = (currentColorConfigIndex + 1) % COLOR_CONFIGS.length
      const destinationColorConfig = COLOR_CONFIGS[currentColorConfigIndex]

      particleColorChangeSpringAPI.start({
        to: destinationColorConfig,
        onChange: (values) => {
          const uniforms = particleMaterial.uniforms
          uniforms.u_R.value = values.value.u_R
          uniforms.u_G.value = values.value.u_G
          uniforms.u_B.value = values.value.u_B
          uniforms.uShadowBias.value = values.value.uShadowBias
          uniforms.uShadowReductionFactor.value = values.value.uShadowReductionFactor
          uniforms.uColorMultiplier.value = values.value.uColorMultiplier
        }
      })
    } else {
      // Restore normal speed
      particleSlowDownSpringAPI.stop()
      particleSlowDownSpringAPI.start({
        to: {
          uSpeed: ParticleStore.getState().uSpeed,
          uDieSpeed: ParticleStore.getState().uDieSpeed
        },
        onChange: (values) => {
          gpgpuVariable.material.uniforms.uSpeed.value = values.value.uSpeed
          gpgpuVariable.material.uniforms.uDieSpeed.value = values.value.uDieSpeed
        }
      })
    }
  }, [isMouseDown, particleSlowDownSpringAPI, particleColorChangeSpringAPI])

  // Optimized render loop
  const dummyVector3 = useRef(new Vector3())
  
  useFrame(({ clock }, delta) => {
    if (ParticleStore.getState().isPaused) return

    const state = ParticleStore.getState()
    
    // Update camera
    camera.updateMatrixWorld()

    // Calculate movement with damping
    let destinationX = state.uFollowPosition.current.x
    let destinationY = state.uFollowPosition.current.y
    let destinationZ = state.uFollowPosition.current.z
    let radiusMultiplier = 1.0

    if (state.isMouseMoving && state.moveWithMouse) {
      destinationX += state.mouseMoveX.current * state.mouseMoveFactor
      destinationY += state.mouseMoveY.current * state.mouseMoveFactor
      radiusMultiplier = 0.5
    }

    // Apply damping
    damp(state.uFollowPositionPlusMouseMove.current, 'x', destinationX, state.isMouseMoving ? 0.25 : 0.05)
    damp(state.uFollowPositionPlusMouseMove.current, 'y', destinationY, state.isMouseMoving ? 0.25 : 0.05)
    damp(state.uFollowPositionPlusMouseMove.current, 'z', destinationZ, state.isMouseMoving ? 0.25 : 0.05)

    // Update radius
    const targetRadius = state.uRadiusAbsolute * radiusMultiplier
    state.uRadiusRef.current = THREE.MathUtils.lerp(state.uRadiusRef.current, targetRadius, 0.1)

    // Update GPGPU uniforms
    const gpgpuUniforms = state.gpgpuParticlesVariable!.material.uniforms
    gpgpuUniforms.uTime.value = clock.getElapsedTime() * state.elapsedTimeFactor
    gpgpuUniforms.uDeltaTime.value = delta
    gpgpuUniforms.uFollowPosition.value = state.uFollowPositionPlusMouseMove.current
    gpgpuUniforms.uRadius.value = state.uRadiusRef.current

    // Compute particles
    state.gpgpuComputationRenderer?.compute()

    // Update material uniforms
    const materialUniforms = state.material!.uniforms
    materialUniforms.uParticlesTexture.value = state.gpgpuComputationRenderer?.getCurrentRenderTarget(
      state.gpgpuParticlesVariable!
    ).texture
    materialUniforms.uTime.value = clock.getElapsedTime() * state.elapsedTimeFactor
    materialUniforms.uFollowPosition.value = state.uFollowPositionPlusMouseMove.current

    // Update depth camera
    dummyVector3.current.set(
      state.uFollowPosition.current.x,
      10,
      state.uFollowPosition.current.z
    )
    state.depthCamera?.position.copy(dummyVector3.current)
    state.depthCamera?.lookAt(state.uFollowPosition.current)
    state.depthCamera?.updateMatrixWorld()

    // Render depth pass
    gl.setRenderTarget(state.depthRenderTarget1!)
    gl.render(scene, state.depthCamera!)
    gl.setRenderTarget(null)

    // Update shadow uniforms
    materialUniforms.uLightDepthTexture.value = state.depthRenderTarget1!.depthTexture
    materialUniforms.uLightMatrix.value = new Matrix4().multiplyMatrices(
      state.depthCamera!.projectionMatrix, 
      state.depthCamera!.matrixWorldInverse
    )

    // Swap render targets
    ParticleStore.setState({
      depthRenderTarget1: state.depthRenderTarget2,
      depthRenderTarget2: state.depthRenderTarget1
    })
  })

  return null
}

// Main optimized particles component
const ParticlesOptimized = () => {
  return (
    <>
      <ParticleSystem />
      {/* <ParticleUniforms /> */}
      <MouseEventHandlers />
      <AdaptiveQuality />
      <ParticleControls />
    </>
  )
}

export default ParticlesOptimized