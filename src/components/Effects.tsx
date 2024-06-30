import { useFrame, useThree } from "@react-three/fiber"
import { folder, useControls } from "leva"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget
} from "three"
import {
  BlendShader,
  CopyShader,
  EffectComposer,
  RenderPass,
  SavePass,
  ShaderPass,
  UnrealBloomPass
} from "three/examples/jsm/Addons.js"
import { GenericStore } from "./GenericStore"


const Effects = () => {
    const { scene, gl, size, camera } = useThree()
    const [uMixRatio, setuMixRatio] = useState(0.65)
    const [uOpactiy, setuOpacity] = useState(1)

    const [bloomStrength, setBloomStrength] = useState(0.28)// 0.18)
    const [bloomRadius, setBloomRadius] = useState(1.06) // 1.27)
    const [bloomThreshold, setBloomThreshold] = useState(0.68) // 0.78)

    const composerRef = useRef<EffectComposer | null>(null)
    const renderPassRef = useRef<RenderPass | null>(null)
    const savePassRef = useRef<SavePass | null>(null)
    const blendPassRef = useRef<ShaderPass | null>(null)
    const unrealBloomPassRef = useRef<UnrealBloomPass | null>(null)
    const outputPassRef = useRef<ShaderPass | null>(null)
    const renderTargetRef = useRef<WebGLRenderTarget | null>(null)
    
    const bloomComposerRef = useRef<EffectComposer | null>(null)
    const finalComposerRef = useRef<EffectComposer | null>(null)

    const composer = useMemo(() => {
      // BEGIN vanilla Three.js
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose()
      }

      if (bloomComposerRef.current) {
        bloomComposerRef.current.dispose()
      }

      if (finalComposerRef.current) {
        finalComposerRef.current.dispose()
      }

      if (composerRef.current) {
        composerRef.current.dispose()
      }

      if (renderPassRef.current) {
        renderPassRef.current.dispose()
      }

      if (savePassRef.current) {
        savePassRef.current.dispose()
      }

      if (blendPassRef.current) {
        blendPassRef.current.dispose()
      }

      if (unrealBloomPassRef.current) {
        unrealBloomPassRef.current.dispose()
      }

      if (outputPassRef.current) {
        outputPassRef.current.dispose()
      }
      
  
      const composer = new EffectComposer(gl)
      composerRef.current = composer
  
      // render pass
      const renderPass = new RenderPass(scene, camera)
      renderPassRef.current = renderPass
      
      const renderTarget = new WebGLRenderTarget(size.width, size.height, {
        colorSpace: SRGBColorSpace
      })
      renderTargetRef.current = renderTarget
      // save pass
      const savePass = new SavePass(renderTarget)
      savePassRef.current = savePass
  
      // blend pass
      const blendPass = new ShaderPass(BlendShader, 'tDiffuse1')
      blendPassRef.current = blendPass
      blendPass.uniforms['tDiffuse2'].value = savePass.renderTarget.texture
      blendPass.uniforms['mixRatio'].value = uMixRatio
      blendPass.uniforms['opacity'].value = uOpactiy

      const unrealBloomPass = new UnrealBloomPass(
        new Vector2(size.width, size.height),
        bloomStrength,
        bloomRadius,
        bloomThreshold
      )
      unrealBloomPassRef.current = unrealBloomPass

      // output pass
      const outputPass = new ShaderPass(CopyShader)
      outputPassRef.current = outputPass
      

      composer.addPass(renderPass)
      composer.addPass(unrealBloomPass)
      composer.addPass(blendPass)
      composer.addPass(savePass)
      composer.addPass(outputPass)
  
      // END vanilla Three.js
      return composer
    }, [
      camera, 
      scene, 
      gl, 
      size, 
      uMixRatio, 
      uOpactiy,
      bloomStrength,
      bloomRadius,
      bloomThreshold
    ])

    useEffect(() => void composer.setSize(size.width, size.height), [size, composer])
    
    useFrame(() => {
      if (GenericStore.getState().effectsEnabled) {
        composer.render()
      }
    }, 1)

    useControls(
      'Effects', 
      () => ({
        enabled: {
          value: true,
          onChange: (v) => GenericStore.setState({ effectsEnabled: v })
        },
        'MotionBlur': folder({
          'uMixRatio': {
            value: uMixRatio,
            min: -2,
            max: 2,
            step: 0.01,
            onChange: (v) => setuMixRatio(v)
          },
          'uOpacity': {
            value: 1,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (v) => setuOpacity(v)
          }
        }, { collapsed: true }),
        'UnrealBloom': folder({
          strength: {
            value: bloomStrength,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: (v) => setBloomStrength(v)
          },
          radius: {
            value: bloomRadius,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: (v) => setBloomRadius(v)
          },
          threshold: {
            value: bloomThreshold,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (v) => setBloomThreshold(v)
          }
        }, { collapsed: true }),
      }),
      {
        collapsed: true,
      } 
    )
    
    return null
}


export default Effects