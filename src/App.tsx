import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { NoToneMapping, PCFSoftShadowMap, WebGLShadowMap } from "three";
import Experience from "./Experience";
import GenericStoreInit, { GenericStore } from "./components/GenericStore";
import { PerformanceMeterDisplay } from "./components/PerformanceMeterDisplay";


const MainCanvas = () => {
  const bindGestures = GenericStore((state) => state.gestureBind)
  const dpr = GenericStore((state) => state.dpr)
  const isFPSMeterVisible = GenericStore((state) => state.isFPSMeterVisible)

  return (
    <Canvas
      {...(bindGestures?.() ?? {})}
      shadows
      gl={{
        preserveDrawingBuffer: true,
        shadowMap: {
          enabled: true,
          type: PCFSoftShadowMap
        } as WebGLShadowMap,
        toneMapping: NoToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{
        fov: 65,
      }}
      dpr={dpr}
    >
      <Experience />
      {
        isFPSMeterVisible &&
        <PerformanceMeterDisplay />
      }
    </Canvas>
  )
}

const App = () => {
  return (
    <>
      <MainCanvas />
      <GenericStoreInit />
      <Leva
        oneLineLabels
        collapsed={true}// default = false, when true the GUI is collpased
      />
    </>
  )
}

export default App