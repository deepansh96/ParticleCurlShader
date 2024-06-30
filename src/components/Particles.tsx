import { SpringRef, useSpring } from "@react-spring/web"
import { useFrame, useThree } from "@react-three/fiber"
import { useControls } from "leva"
import { damp } from 'maath/easing'
import { createRef, MutableRefObject, useEffect, useRef } from "react"
import * as THREE from 'three'
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, NoBlending, OrthographicCamera, PlaneGeometry, Points, ShaderMaterial, SphereGeometry, Texture, Uniform, Vector2, Vector3, WebGLRenderTarget } from "three"
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js'
import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import gpgpuParticlesShader from "../shaders/gpgpu/particles.glsl"
import particlesFragmentShader from "../shaders/particles/fragment.glsl"
import particlesVertexShader from "../shaders/particles/vertex.glsl"
import { GenericStore } from "./GenericStore"

const defaultColorConfig = {
  u_R: 0.656,
  u_G: 1,
  u_B: 1,
  uShadowBias: 0.0022,
  uShadowReductionFactor: 0.53,
  uColorMultiplier: 1.3,
}

const yellowColorConfig = {
  u_R: 0.97,
  u_G: 0.97,
  u_B: 0.4,
  uShadowBias: 0.01,
  uShadowReductionFactor: 0.41,
  uColorMultiplier: 1.1
}

const purpleColorConfig = {
  u_R: 0.7,
  u_G: 0,
  u_B: 1,
  uShadowBias: 0.0021,
  uShadowReductionFactor: 0.801,
  uColorMultiplier: 2.675
}

const colorConfigs = [
  defaultColorConfig,
  yellowColorConfig,
  purpleColorConfig
]

let currentColorConfigIndex = 0

interface IParticleStore {
  baseGeometry: BufferGeometry | null
  material: ShaderMaterial | null
  points: Points | null
  baseGeometryCount: number
  gpgpuSize: number
  gpgpuComputationRenderer: GPUComputationRenderer | null
  gpgpuBaseParticleTexture: Texture | null
  gpgpuBaseParticleNormalTexture: Texture | null
  gpgpuParticlesVariable: Variable | null
  gpgpuParticlesNormalVariable: Variable | null
  gpgpuDebugPlane: Mesh | null
  uSize: number
  uFlowFieldInfluence: number
  uFlowFieldStrength: number
  uFlowFieldFrequency: number

  uRadiusRef: MutableRefObject<number>
  uRadiusAbsolute: number
  uDieSpeed: number
  uAttraction: number
  uSpeed: number
  uCurlSize: number
  uA: number
  uB: number
  uC: number
  uD: number
  uE: number
  uF: number
  uG: number
  uH: number
  uI: number
  uJ: number
  uK: number
  uL: number
  uM: number
  uCurlTimeReducer: number
  uPointSizeNumerator: number
  uPointSizeSmoothStepStart: number
  uPointSizeSmoothStepEnd: number
  uShadowReductionFactor: number
  uNumberOfSamples: number
  uSpread: number
  uShadowBias: number
  uFollowMouse: 0 | 1
  uFollowPosition: MutableRefObject<Vector3>
  uFollowPositionPlusMouseMove: MutableRefObject<Vector3>
  u_R: number
  u_G: number
  u_B: number
  currentColorMode: 'default' | 'yellow' | 'purple'
  isParticleColorChangeAnimGoingOn: boolean
  uColorMultiplier: number
  isYellowMode: boolean

  depthCamera: OrthographicCamera | null
  depthRenderTarget1: WebGLRenderTarget | null
  depthRenderTarget2: WebGLRenderTarget | null
  depthCameraPosition: Vector3
  depthCameraTarget: Vector3
  isMouseDown: boolean
  isPaused: boolean

  mouseMoveX: MutableRefObject<number>
  mouseMoveY: MutableRefObject<number>
  mouseMoveFactor: number
  mouseMoveInterval: number | null
  isMouseMoving: boolean
  elapsedTimeFactor: number
  particleColorChangeSpringAPI: SpringRef<{
      u_R: number;
      u_G: number;
      u_B: number;
      uShadowBias: number;
      uShadowReductionFactor: number;
      uColorMultiplier: number;
  }> | null
  clickToColorChange: boolean
  moveWithMouse: boolean
}

const mouseMoveX = createRef<number>() as MutableRefObject<number>
mouseMoveX.current = 0

const mouseMoveY = createRef<number>() as MutableRefObject<number>
mouseMoveY.current = 0

const uFollowPosition = createRef<Vector3>() as MutableRefObject<Vector3>
uFollowPosition.current = new Vector3()

const uFollowPositionPlusMouseMove = createRef<Vector3>() as MutableRefObject<Vector3>
uFollowPositionPlusMouseMove.current = new Vector3()

const uRadiusRef = createRef<number>() as MutableRefObject<number>
uRadiusRef.current = 0.58

export const ParticleStore = create<IParticleStore>(() => ({
  baseGeometry: null,
  material: null,
  points: null,
  baseGeometryCount: 0,
  gpgpuSize: 0,
  gpgpuComputationRenderer: null,
  gpgpuBaseParticleTexture: null,
  gpgpuBaseParticleNormalTexture: null,
  gpgpuParticlesVariable: null,
  gpgpuParticlesNormalVariable: null,
  gpgpuDebugPlane: null,

  uSize: 1.03, // 1.78,
  uFlowFieldInfluence: 0.5,
  uFlowFieldStrength: 0,
  uFlowFieldFrequency: 1,
  uRadiusRef,
  uRadiusAbsolute: 0.58,
  uDieSpeed: 1.22, // 2.16,
  uAttraction: 11.35, // 11.7,
  uSpeed: 0.04, // 0.07,
  uCurlSize: 0.38,
  uA: 0.49, // curl breathing rate
  uB: 1.0,
  uC: 13.2, // emitter breathing rate
  uD: 0.17,
  uE: 0.45,
  uF: 0.71,
  uG: 21.4131,
  uH: 0.01,
  uI: 0.01,
  uJ: 50.0,
  uK: 350.0,
  uL: 0.1,
  uM: 0.1,
  uCurlTimeReducer: 0.59, // 1,
  uPointSizeNumerator: 41,
  uPointSizeSmoothStepStart: 0.06,
  uPointSizeSmoothStepEnd: 0.5,
  uShadowReductionFactor: defaultColorConfig.uShadowReductionFactor,
  uNumberOfSamples: 2,
  uSpread: 512,
  uShadowBias: defaultColorConfig.uShadowBias,
  uFollowMouse: 1,
  u_R: defaultColorConfig.u_R,
  u_G: defaultColorConfig.u_G,
  u_B: defaultColorConfig.u_B,
  currentColorMode: "default",
  isParticleColorChangeAnimGoingOn: false,
  uColorMultiplier: defaultColorConfig.uColorMultiplier,
  isYellowMode: false,
  uFollowPosition,
  uFollowPositionPlusMouseMove,
  depthCamera: null,
  depthRenderTarget1: null,
  depthRenderTarget2: null,
  depthCameraPosition: new Vector3(0, 10, 0),
  depthCameraTarget: new Vector3(),
  isMouseDown: false,
  isPaused: false,

  mouseMoveX,
  mouseMoveY,
  mouseMoveFactor: 4,
  mouseMoveInterval: null,
  isMouseMoving: false,
  elapsedTimeFactor: 0.7,
  particleColorChangeSpringAPI: null,
  clickToColorChange: true,
  moveWithMouse: true
}))

const ParticleVariableListeners = () => {
  const {
    uDieSpeed,
    uAttraction,
    uSpeed,
    uCurlSize,
    depthCameraPosition,
    depthCameraTarget,
    uL,
    uM,
    uPointSizeNumerator,
    u_R,
    u_G,
    u_B,
    isPaused,
    uShadowReductionFactor,
  } = ParticleStore(
    useShallow((state) => ({
      uDieSpeed: state.uDieSpeed,
      uAttraction: state.uAttraction,
      uSpeed: state.uSpeed,
      uCurlSize: state.uCurlSize,
      depthCameraPosition: state.depthCameraPosition,
      depthCameraTarget: state.depthCameraTarget,
      uL: state.uL,
      uM: state.uM,
      uPointSizeNumerator: state.uPointSizeNumerator,
      u_R: state.u_R,
      u_G: state.u_G,
      u_B: state.u_B,
      isPaused: state.isPaused,
      uShadowReductionFactor: state.uShadowReductionFactor,
    }))
  )

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uDieSpeed.value = uDieSpeed
  }, [uDieSpeed])

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uAttraction.value = uAttraction
  }, [uAttraction])

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uSpeed.value = uSpeed
  }, [uSpeed])

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uCurlSize.value = uCurlSize
  }, [uCurlSize])

  useEffect(() => {
    const depthCamera = ParticleStore.getState().depthCamera
    if (depthCamera !== null) depthCamera.position.copy(depthCameraPosition)
  }, [depthCameraPosition])

  useEffect(() => {
    const depthCamera = ParticleStore.getState().depthCamera
    if (depthCamera !== null) depthCamera.lookAt(depthCameraTarget)
  }, [depthCameraTarget])

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uL.value = uL
  }, [uL])

  useEffect(() => {
    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable !== null) gpgpuVariable.material.uniforms.uM.value = uM
  }, [uM])

  useEffect(() => {
    const material = ParticleStore.getState().material
    if (material !== null) material.uniforms.uPointSizeNumerator.value = uPointSizeNumerator
  }, [uPointSizeNumerator])

  useEffect(() => {
    const material = ParticleStore.getState().material
    if (material !== null) {
      material.uniforms.u_R.value = u_R
      material.uniforms.u_G.value = u_G
      material.uniforms.u_B.value = u_B
    }
  }, [u_R, u_G, u_B])

  useEffect(() => {
    const points = ParticleStore.getState().points
    if (points) {
      if (isPaused) points.visible = false
      else points.visible = true
    }
  }, [isPaused])

  useEffect(() => {
    const material = ParticleStore.getState().material
    if (material !== null) material.uniforms.uShadowReductionFactor.value = uShadowReductionFactor
  }, [uShadowReductionFactor])

  return <></>
}

const ClickToColorChangeAndMouseMove = () => {
  useEffect(() => {
    const handleMouseDown = () => {
      if (!ParticleStore.getState().clickToColorChange) return
      ParticleStore.setState({ isMouseDown: true });
    }
    const handleMouseUp = () => ParticleStore.setState({ isMouseDown: false });
    const handleMouseMove = (event: MouseEvent) => {
      if (ParticleStore.getState().mouseMoveInterval) clearInterval(ParticleStore.getState().mouseMoveInterval!)
      ParticleStore.getState().isMouseMoving = true

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;

      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const normalizedX = (mouseX - centerX) / centerX;
      const normalizedY = - (mouseY - centerY) / centerY;

      ParticleStore.getState().mouseMoveX.current = normalizedX;
      ParticleStore.getState().mouseMoveY.current = normalizedY;

      ParticleStore.getState().mouseMoveInterval = setInterval(() => {
        ParticleStore.getState().isMouseMoving = false
      }, 1500)
    }
  
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleMouseDown);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
  
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <></>
}

const Particles = () => {
  const { scene, gl, camera } = useThree()

  const {
    width,
    height,
    dpr
  } = GenericStore(
    useShallow((state) => ({
      width: state.width,
      height: state.height,
      dpr: state.dpr
    }))
  )

  const isMouseDown = ParticleStore((state) => state.isMouseDown)

  useEffect(() => {

    // Setup depth camera and render target
    const depthCamera = new OrthographicCamera(-5, 5, 5, -5, 0, 50);
    depthCamera.position.copy(ParticleStore.getState().depthCameraPosition);
    depthCamera.lookAt(ParticleStore.getState().depthCameraTarget);

    const createRenderTarget = (size: number) => {
      const renderTarget = new THREE.WebGLRenderTarget(size, size);
      renderTarget.texture.minFilter = THREE.NearestFilter;
      renderTarget.texture.magFilter = THREE.NearestFilter;
      renderTarget.stencilBuffer = false;
      renderTarget.depthTexture = new THREE.DepthTexture(size, size);
      renderTarget.depthTexture.format = THREE.DepthFormat;
      renderTarget.depthTexture.type = THREE.UnsignedShortType;
      return renderTarget;
    };

    const depthRenderTarget1 = createRenderTarget(512);
    const depthRenderTarget2 = createRenderTarget(512);


    ParticleStore.setState({ depthCamera, depthRenderTarget1, depthRenderTarget2 })

    // const multiplier = 10
    const amount = GenericStore.getState().isTouchDevice ? 128 : 256
    const baseGeometry = new SphereGeometry(3, amount, amount)

    const material = new ShaderMaterial({
      vertexShader: particlesVertexShader,
      fragmentShader: particlesFragmentShader,
      uniforms: {
        uSize: new Uniform(ParticleStore.getState().uSize),
        uResolution: new Uniform(new Vector2(
          GenericStore.getState().width * GenericStore.getState().dpr,
          GenericStore.getState().height * GenericStore.getState().dpr
        )),
        uParticlesTexture: new Uniform(null),
        uParticlesNormalTexture: new Uniform(null),
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
      // transparent: true,
      depthTest: true,
      blending: NoBlending,
      toneMapped: false,
    })
    const baseGeometryCount = baseGeometry.attributes.position.count

    const gpgpuSize = Math.ceil(Math.sqrt(baseGeometryCount))
    const gpgpuComputationRenderer = new GPUComputationRenderer(gpgpuSize, gpgpuSize, gl)
    const gpgpuBaseParticleTexture = gpgpuComputationRenderer.createTexture()
    for (let i = 0; i < baseGeometryCount; i++) {
      const i3 = i * 3
      const i4 = i * 4

      gpgpuBaseParticleTexture.image.data[i4 + 0] = baseGeometry.attributes.position.array[i3 + 0]
      gpgpuBaseParticleTexture.image.data[i4 + 1] = baseGeometry.attributes.position.array[i3 + 1]
      gpgpuBaseParticleTexture.image.data[i4 + 2] = baseGeometry.attributes.position.array[i3 + 2]
      gpgpuBaseParticleTexture.image.data[i4 + 3] = Math.random()
    }

    const gpgpuParticlesVariable = gpgpuComputationRenderer.addVariable('uParticles', gpgpuParticlesShader, gpgpuBaseParticleTexture)
    gpgpuComputationRenderer.setVariableDependencies(gpgpuParticlesVariable, [gpgpuParticlesVariable])
    gpgpuParticlesVariable.material.uniforms.uTime = new Uniform(0)
    gpgpuParticlesVariable.material.uniforms.uBase = new Uniform(gpgpuBaseParticleTexture)
    gpgpuParticlesVariable.material.uniforms.uDeltaTime = new Uniform(0)
    gpgpuParticlesVariable.material.uniforms.uFlowFieldInfluence = new Uniform(0.5)
    gpgpuParticlesVariable.material.uniforms.uFlowFieldStrength = new Uniform(3)
    gpgpuParticlesVariable.material.uniforms.uFlowFieldFrequency = new Uniform(1)
    gpgpuParticlesVariable.material.uniforms.uFollowPosition = new Uniform(ParticleStore.getState().uFollowPosition)
    gpgpuParticlesVariable.material.uniforms.uRadius = new Uniform(ParticleStore.getState().uRadiusRef.current)
    gpgpuParticlesVariable.material.uniforms.uDieSpeed = new Uniform(ParticleStore.getState().uDieSpeed)
    gpgpuParticlesVariable.material.uniforms.uAttraction = new Uniform(ParticleStore.getState().uAttraction)
    gpgpuParticlesVariable.material.uniforms.uSpeed = new Uniform(ParticleStore.getState().uSpeed)
    gpgpuParticlesVariable.material.uniforms.uCurlSize = new Uniform(ParticleStore.getState().uCurlSize)
    gpgpuParticlesVariable.material.uniforms.uA = new Uniform(ParticleStore.getState().uA)
    gpgpuParticlesVariable.material.uniforms.uB = new Uniform(ParticleStore.getState().uB)
    gpgpuParticlesVariable.material.uniforms.uC = new Uniform(ParticleStore.getState().uC)
    gpgpuParticlesVariable.material.uniforms.uD = new Uniform(ParticleStore.getState().uD)
    gpgpuParticlesVariable.material.uniforms.uE = new Uniform(ParticleStore.getState().uE)
    gpgpuParticlesVariable.material.uniforms.uF = new Uniform(ParticleStore.getState().uF)
    gpgpuParticlesVariable.material.uniforms.uG = new Uniform(ParticleStore.getState().uG)
    gpgpuParticlesVariable.material.uniforms.uH = new Uniform(ParticleStore.getState().uH)
    gpgpuParticlesVariable.material.uniforms.uI = new Uniform(ParticleStore.getState().uI)
    gpgpuParticlesVariable.material.uniforms.uJ = new Uniform(ParticleStore.getState().uJ)
    gpgpuParticlesVariable.material.uniforms.uK = new Uniform(ParticleStore.getState().uK)
    gpgpuParticlesVariable.material.uniforms.uL = new Uniform(ParticleStore.getState().uL)
    gpgpuParticlesVariable.material.uniforms.uM = new Uniform(ParticleStore.getState().uM)
    gpgpuParticlesVariable.material.uniforms.uFollowMouse = new Uniform(ParticleStore.getState().uFollowMouse)
    gpgpuParticlesVariable.material.uniforms.uCurlTimeReducer = new Uniform(ParticleStore.getState().uCurlTimeReducer);
    
    // gpgpuParticlesVariable.material.uniforms.mouse3d = new Uniform(ParticleStore.getState().mouse3D)
    // gpgpuParticlesVariable.material.uniforms.uInitAnimation = new Uniform(0)

    gpgpuComputationRenderer.init()

    const gpgpuDebugPlane = new Mesh(
      new PlaneGeometry(3, 3),
      new MeshBasicMaterial({
        map: gpgpuComputationRenderer.getCurrentRenderTarget(gpgpuParticlesVariable).texture
      }),

      // // to view the depth
      // new ShaderMaterial({
      //   vertexShader: `
      //   varying vec2 vUv;

      //   void main() {
      //     vUv = uv;
      //     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      //   }
      //   `,
      //   fragmentShader: `
      //   #include <packing>

      //   varying vec2 vUv;
      //   uniform sampler2D tDiffuse;
      //   uniform sampler2D tDepth;
      //   uniform float cameraNear;
      //   uniform float cameraFar;


      //   // float readDepth( sampler2D depthSampler, vec2 coord ) {
      //   //   float fragCoordZ = texture2D( depthSampler, coord ).x;
      //   //   float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
      //   //   return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
      //   // }

      //   float readDepth(sampler2D depthSampler, vec2 coord) {
      //     float fragCoordZ = texture2D(depthSampler, coord).x;
      //     float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      //     return viewZ;
      //   }

      //   void main() {
      //     // vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
      //     // float depth = readDepth( tDepth, vUv );
      //     float rawDepth = texture2D(tDepth, vUv).x; // Raw depth value
      //     float depthNormalized = (rawDepth - cameraNear) / (cameraFar - cameraNear); // Normalize depth

      //     // gl_FragColor.rgb = 1.0 - vec3( depth );
      //     // gl_FragColor.rgb = vec3(rawDepth);
      //     // gl_FragColor.rgb = vec3(depth);
      //     gl_FragColor.rgb = vec3(depthNormalized * 50.0);
      //     // gl_FragColor.rgb = diffuse;
      //     // gl_FragColor.rgb = vec3(1.0, 0.0, 0.0);
      //     gl_FragColor.a = 1.0;
      //   }
      //   `,
      //   uniforms: {
      //     cameraNear: { value: depthCamera.near },
      //     cameraFar: { value: depthCamera.far },
      //     tDiffuse: { value: null },
      //     tDepth: { value: null }
      //   }

      // })
    )
    gpgpuDebugPlane.position.set(3, 0, 0)
    gpgpuDebugPlane.visible = false
    scene.add(gpgpuDebugPlane)

    const particlesUVArray = new Float32Array(baseGeometryCount * 2)
    const particleSizesArray = new Float32Array(baseGeometryCount)
    // filling the UV array
    for (let y = 0; y < gpgpuSize; y++) {
      for (let x = 0; x < gpgpuSize; x++) {
        const i = x + y * gpgpuSize
        const i2 = i * 2

        const uvX = (x + 0.5) / gpgpuSize
        const uvY = (y + 0.5) / gpgpuSize

        particlesUVArray[i2 + 0] = uvX
        particlesUVArray[i2 + 1] = uvY

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
  }, [])

  useEffect(() => {
    ParticleStore.getState().material?.uniforms.uResolution.value.set(
      GenericStore.getState().width * GenericStore.getState().dpr,
      GenericStore.getState().height * GenericStore.getState().dpr
    )
  }, [width, height, dpr])

  const [, particleSlowDownSpringAPI] = useSpring(() => ({
    from: { 
      uSpeed: ParticleStore.getState().uSpeed,
      uDieSpeed: ParticleStore.getState().uDieSpeed
    },
  }))

  const [, particleColorChangeSpringAPI] = useSpring(() => ({
    from: {
      u_R: ParticleStore.getState().u_R,
      u_G: ParticleStore.getState().u_G,
      u_B: ParticleStore.getState().u_B,
      uShadowBias: ParticleStore.getState().uShadowBias,
      uShadowReductionFactor: ParticleStore.getState().uShadowReductionFactor,
      uColorMultiplier: ParticleStore.getState().uColorMultiplier
    },
  }))
  ParticleStore.getState().particleColorChangeSpringAPI = particleColorChangeSpringAPI

  useEffect(() => {
    if (ParticleStore.getState().isPaused) return

    const gpgpuVariable = ParticleStore.getState().gpgpuParticlesVariable
    if (gpgpuVariable == null) return

    const particleMaterial = ParticleStore.getState().material
    if (particleMaterial == null) return

    if (isMouseDown) {
        particleSlowDownSpringAPI.stop()
        particleSlowDownSpringAPI.start({
          to: {
            uSpeed: ParticleStore.getState().uSpeed * 0.1,
            uDieSpeed: ParticleStore.getState().uDieSpeed * 0.4
          },
          onChange: (values) => {
            gpgpuVariable.material.uniforms.uSpeed = new Uniform(values.value.uSpeed)
            gpgpuVariable.material.uniforms.uDieSpeed = new Uniform(values.value.uDieSpeed)
          }
        })

        if (ParticleStore.getState().isParticleColorChangeAnimGoingOn) return
        particleColorChangeSpringAPI.stop()
        
        let destinationColorConfig = defaultColorConfig

        currentColorConfigIndex = (currentColorConfigIndex + 1) % colorConfigs.length
        destinationColorConfig = colorConfigs[currentColorConfigIndex]

        particleColorChangeSpringAPI.start({
          to: destinationColorConfig,
          onChange: (values) => {
            particleMaterial.uniforms.u_R.value = values.value.u_R
            particleMaterial.uniforms.u_G.value = values.value.u_G
            particleMaterial.uniforms.u_B.value = values.value.u_B
            particleMaterial.uniforms.uShadowBias.value = values.value.uShadowBias
            particleMaterial.uniforms.uShadowReductionFactor.value = values.value.uShadowReductionFactor
            particleMaterial.uniforms.uColorMultiplier.value = values.value.uColorMultiplier
          },
          onRest: () => {
            ParticleStore.setState({ 
              isParticleColorChangeAnimGoingOn: false
            })
          }
        })
    } else {
        particleSlowDownSpringAPI.stop()
        particleSlowDownSpringAPI.start({
          to: {
            uSpeed: ParticleStore.getState().uSpeed,
            uDieSpeed: ParticleStore.getState().uDieSpeed
          },
          onChange: (values) => {
            gpgpuVariable.material.uniforms.uSpeed = new Uniform(values.value.uSpeed)
            gpgpuVariable.material.uniforms.uDieSpeed = new Uniform(values.value.uDieSpeed)
          }
        })
    }
  }, [isMouseDown])

  const dummyVector3 = useRef(new Vector3())

  useFrame(({ clock }, delta) => {
    if (ParticleStore.getState().isPaused) return

    const state = ParticleStore.getState()
    camera.updateMatrixWorld();

    // not being used anymore
    // state.gpgpuParticlesVariable!.material.uniforms.mouse3d.value = state.mouse3D
    let destinationPositionX: number = state.uFollowPosition.current.x
    let destinationPositionY: number = state.uFollowPosition.current.y
    let destinationPositionZ: number = state.uFollowPosition.current.z

    let uRadiusToUse = {
      uRadius: state.uRadiusRef.current
    }
    let destination_uRadius: number = state.uRadiusRef.current

    if (state.isMouseMoving && !state.isYellowMode && state.moveWithMouse) {
      destinationPositionX = state.uFollowPosition.current.x + (state.mouseMoveX.current * state.mouseMoveFactor)
      destinationPositionY = state.uFollowPosition.current.y + (state.mouseMoveY.current * state.mouseMoveFactor)
      destinationPositionZ = state.uFollowPosition.current.z
      damp(state.uFollowPositionPlusMouseMove.current, 'x', destinationPositionX, 0.25)
      damp(state.uFollowPositionPlusMouseMove.current, 'y', destinationPositionY, 0.25)
      damp(state.uFollowPositionPlusMouseMove.current, 'z', destinationPositionZ, 0.25)

      destination_uRadius = state.uRadiusAbsolute * 0.5
    } else {
      destinationPositionX = state.uFollowPosition.current.x
      destinationPositionY = state.uFollowPosition.current.y
      destinationPositionZ = state.uFollowPosition.current.z

      damp(state.uFollowPositionPlusMouseMove.current, 'x', destinationPositionX, 0.05)
      damp(state.uFollowPositionPlusMouseMove.current, 'y', destinationPositionY, 0.05)
      damp(state.uFollowPositionPlusMouseMove.current, 'z', destinationPositionZ, 0.05)

      destination_uRadius = state.uRadiusAbsolute
    }

    
    damp(uRadiusToUse, 'uRadius', destination_uRadius, 0.1)
    ParticleStore.getState().uRadiusRef.current = uRadiusToUse.uRadius

    state.gpgpuParticlesVariable!.material.uniforms.uTime.value = clock.getElapsedTime() * state.elapsedTimeFactor
    state.gpgpuParticlesVariable!.material.uniforms.uDeltaTime.value = delta
    // state.gpgpuParticlesVariable!.material.uniforms.uFollowPosition.value = state.uFollowPosition.current
    state.gpgpuParticlesVariable!.material.uniforms.uFollowPosition.value = state.uFollowPositionPlusMouseMove.current
    state.gpgpuParticlesVariable!.material.uniforms.uRadius.value = uRadiusToUse.uRadius
    state.gpgpuComputationRenderer?.compute()

    state.material!.uniforms.uParticlesTexture.value = state.gpgpuComputationRenderer?.getCurrentRenderTarget(
      state.gpgpuParticlesVariable!
    ).texture
    state.material!.uniforms.uTime.value = clock.getElapsedTime() * state.elapsedTimeFactor
    // state.material!.uniforms.uFollowPosition.value = state.uFollowPosition.current
    state.material!.uniforms.uFollowPosition.value = state.uFollowPositionPlusMouseMove.current


    // Update depth camera position and orientation
    dummyVector3.current.set(
      state.uFollowPosition.current.x,
      10,
      state.uFollowPosition.current.z
    )
    state.depthCamera?.position.copy(dummyVector3.current)
    state.depthCamera?.lookAt(state.uFollowPosition.current)
    state.depthCamera?.updateMatrixWorld();
    state.depthCamera?.updateProjectionMatrix();

    // Render scene to depth texture using double buffering
    const currentRenderTarget = state.depthRenderTarget1;
    const nextRenderTarget = state.depthRenderTarget2;
    // Render scene to depth texture
    gl.setRenderTarget(currentRenderTarget);
    gl.render(scene, state.depthCamera!);
    gl.setRenderTarget(null);

    // // uncomment to see the depth map on the debug plane. Also uncomment the debug plane shader material
    // // @ts-ignore
    // state.gpgpuDebugPlane.material.uniforms.tDiffuse.value = currentRenderTarget.texture;
    // // @ts-ignore
    // state.gpgpuDebugPlane.material.uniforms.tDepth.value = currentRenderTarget.depthTexture;
    // // @ts-ignore
    // state.gpgpuDebugPlane.material.uniforms.cameraNear.value = state.depthCamera!.near;
    // // @ts-ignore
    // state.gpgpuDebugPlane.material.uniforms.cameraFar.value = state.depthCamera!.far;

    //@ts-ignore
    state.material!.uniforms.uLightDepthTexture.value = currentRenderTarget.depthTexture;
    //@ts-ignore
    state.material!.uniforms.uLightMatrix.value = new Matrix4().multiplyMatrices(state.depthCamera!.projectionMatrix, state.depthCamera!.matrixWorldInverse)

    // Swap render targets for the next frame
    ParticleStore.setState({
      depthRenderTarget1: nextRenderTarget,
      depthRenderTarget2: currentRenderTarget
    });
  })

  useControls(
    'Particles',
    () => ({
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
          ParticleStore.getState().elapsedTimeFactor = value
        }
      },
      mouseMoveFactor: {
        value: ParticleStore.getState().mouseMoveFactor,
        min: 0,
        max: 10,
        step: 0.1,
        onChange: (value: number) => {
          ParticleStore.getState().mouseMoveFactor = value
        }
      },
      uSize: {
        value: ParticleStore.getState().uSize,
        min: 0.001,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.getState().material!.uniforms.uSize.value = value
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
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uRadius = new Uniform(value)
        }
      },
      uDieSpeed: {
        value: ParticleStore.getState().uDieSpeed,
        min: 0,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uDieSpeed: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uDieSpeed = new Uniform(value)
        }
      },
      uAttraction: {
        value: ParticleStore.getState().uAttraction,
        min: 0,
        max: 100,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uAttraction: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uAttraction = new Uniform(value)
        }
      },
      uSpeed: {
        value: ParticleStore.getState().uSpeed,
        min: 0,
        max: 0.1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uSpeed: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uSpeed = new Uniform(value)
        }
      },
      uCurlSize: {
        value: ParticleStore.getState().uCurlSize,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uCurlSize: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uCurlSize = new Uniform(value)
        }
      },
      uCurlTimeReducer: {
        value: ParticleStore.getState().uCurlTimeReducer,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uCurlTimeReducer: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uCurlTimeReducer = new Uniform(value)
        }
      },
      uA: {
        value: ParticleStore.getState().uA,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uA: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uA = new Uniform(value)
        }
      },
      uB: {
        value: ParticleStore.getState().uB,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uB: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uB = new Uniform(value)
        }
      },
      uC: {
        value: ParticleStore.getState().uC,
        min: 0,
        max: 30,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uC: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uC = new Uniform(value)
        }
      },
      uD: {
        value: ParticleStore.getState().uD,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uD: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uD = new Uniform(value)
        }
      },
      uE: {
        value: ParticleStore.getState().uE,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uE: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uE = new Uniform(value)
        }
      },
      uF: {
        value: ParticleStore.getState().uF,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uF: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uF = new Uniform(value)
        }
      },
      uG: {
        value: ParticleStore.getState().uG,
        min: 0,
        max: 500,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uG: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uG = new Uniform(value)
        }
      },
      uH: {
        value: ParticleStore.getState().uH,
        min: 0,
        max: 0.1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uH: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uH = new Uniform(value)
        }
      },
      uI: {
        value: ParticleStore.getState().uI,
        min: 0,
        max: 0.1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uI: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uI = new Uniform(value)
        }
      },
      uJ: {
        value: ParticleStore.getState().uJ,
        min: 0,
        max: 100,
        step: 0.1,
        onChange: (value: number) => {
          ParticleStore.setState({ uJ: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uJ = new Uniform(value)
        }
      },
      uK: {
        value: ParticleStore.getState().uK,
        min: 0,
        max: 700,
        step: 0.1,
        onChange: (value: number) => {
          ParticleStore.setState({ uK: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uK = new Uniform(value)
        }
      },
      uL: {
        value: ParticleStore.getState().uL,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uL: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uL = new Uniform(value)
        }
      },
      uM: {
        value: ParticleStore.getState().uM,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uM: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uM = new Uniform(value)
        }
      },
      uPointSizeNumerator: {
        value: ParticleStore.getState().uPointSizeNumerator,
        min: 0,
        max: 100,
        step: 1,
        onChange: (value: number) => {
          ParticleStore.setState({ uPointSizeNumerator: value })
          ParticleStore.getState().material!.uniforms.uPointSizeNumerator.value = value
        }
      },
      uPointSizeSmoothStepStart: {
        value: ParticleStore.getState().uPointSizeSmoothStepStart,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uPointSizeSmoothStepStart: value })
          ParticleStore.getState().material!.uniforms.uPointSizeSmoothStepStart.value = value
        }
      },
      uPointSizeSmoothStepEnd: {
        value: ParticleStore.getState().uPointSizeSmoothStepEnd,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uPointSizeSmoothStepEnd: value })
          ParticleStore.getState().material!.uniforms.uPointSizeSmoothStepEnd.value = value
        }
      },
      uShadowReductionFactor: {
        value: ParticleStore.getState().uShadowReductionFactor,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ uShadowReductionFactor: value })
          ParticleStore.getState().material!.uniforms.uShadowReductionFactor.value = value
          // console.log({shadowReductionFactor: value})
        }
      },
      uNumberOfSamples: {
        value: ParticleStore.getState().uNumberOfSamples,
        min: 0,
        max: 10,
        step: 1,
        onChange: (value: number) => {
          ParticleStore.setState({ uNumberOfSamples: value })
          ParticleStore.getState().material!.uniforms.uNumberOfSamples.value = value
        }
      },
      uSpread: {
        value: ParticleStore.getState().uSpread,
        min: 0,
        max: 1000,
        step: 1,
        onChange: (value: number) => {
          ParticleStore.setState({ uSpread: value })
          ParticleStore.getState().material!.uniforms.uSpread.value = value
          // console.log({spread: value})
        }
      },
      uShadowBias: {
        name: 'uShadowBias',
        value: ParticleStore.getState().uShadowBias,
        min: 0,
        max: 0.01,
        step: 0.0001,
        onChange: (value: number) => {
          ParticleStore.setState({ uShadowBias: value })
          ParticleStore.getState().material!.uniforms.uShadowBias.value = value
          // console.log({shadowBias: value})
        }
      },
      uFollowMouse: {
        value: ParticleStore.getState().uFollowMouse,
        min: 0,
        max: 1,
        step: 1,
        onChange: (value: 0 | 1) => {
          ParticleStore.setState({ uFollowMouse: value })
          ParticleStore.getState().gpgpuParticlesVariable!.material.uniforms.uFollowMouse = new Uniform(value)
        }
      },      
      u_R: {
        value: ParticleStore.getState().u_R,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ u_R: value })
          ParticleStore.getState().material!.uniforms.u_R.value = value
          // console.log({
          //   u_R: ParticleStore.getState().u_R,
          //   u_G: ParticleStore.getState().u_G,
          //   u_B: ParticleStore.getState().u_B
          // })
        }
      },
      u_G: {
        value: ParticleStore.getState().u_G,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ u_G: value })
          ParticleStore.getState().material!.uniforms.u_G.value = value
          // console.log({
          //   u_R: ParticleStore.getState().u_R,
          //   u_G: ParticleStore.getState().u_G,
          //   u_B: ParticleStore.getState().u_B
          // })
        }
      },
      u_B: {
        value: ParticleStore.getState().u_B,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.setState({ u_B: value })
          ParticleStore.getState().material!.uniforms.u_B.value = value
          // console.log({
          //   u_R: ParticleStore.getState().u_R,
          //   u_G: ParticleStore.getState().u_G,
          //   u_B: ParticleStore.getState().u_B
          // })
        }
      },
      uColorMultiplier: {
        value: ParticleStore.getState().uColorMultiplier,
        min: 1,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          // ParticleStore.setState({ uColorMultiplier: value })
          ParticleStore.getState().material!.uniforms.uColorMultiplier.value = value
          // console.log({colorMultiplier: value}) 
        }
      },
      pointsPositionX: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.getState().points?.position.setX(value)
        }
      },
      pointsPositionY: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.getState().points?.position.setY(value)
        }
      },
      pointsPositionZ: {
        value: 0,
        min: -10,
        max: 10,
        step: 0.001,
        onChange: (value: number) => {
          ParticleStore.getState().points?.position.setZ(value)
        }
      },
    }),
    {
      collapsed: true,
    },
  )

  return (
  <>
    <ParticleVariableListeners />
    <ClickToColorChangeAndMouseMove />
  </>
  )
}

export default Particles