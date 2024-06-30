import { Backdrop, GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
// import { useControls } from 'leva';
import { useEffect } from 'react';
import Effects from './components/Effects';
import { GenericStore } from './components/GenericStore';
import Particles from './components/Particles';

const Experience = () => {
  const { gl } = useThree()
  useEffect(() => {
    GenericStore.setState({ canvasDomElement: gl.domElement })
  }, [gl])

  const orbitControlsConfig = GenericStore((state) => state.orbitControlsConfig)


  // useControls(
  //   'Experience',
  //   () => ({
  //   }),
  //   {
  //     collapsed: true,
  //   },
  // )


  return (
    <>
      <color attach="background" args={['#353540']} />
      <OrbitControls 
        enabled={orbitControlsConfig.enabled}
        maxPolarAngle={orbitControlsConfig.maxPolarAngle}
        minPolarAngle={orbitControlsConfig.minPolarAngle}
        maxAzimuthAngle={orbitControlsConfig.maxAzimuthAngle}
        minAzimuthAngle={orbitControlsConfig.minAzimuthAngle}
        maxDistance={orbitControlsConfig.maxDistance}
      />
      <Particles />
        <Backdrop
          floor={0.25} // Stretches the floor segment, 0.25 by default
          segments={20} // Mesh-resolution, 20 by default
          receiveShadow={true} // Whether the floor receives shadows, false by default
          scale={[200, 30, 30]} // Scales the floor, 1 by default
          position={[0, -5, 5]} // Position of the floor, [
        >
          <meshStandardMaterial color="#353540" />
        </Backdrop>
      <pointLight
        position={[0, 3, 0]}
        intensity={100.5}
        color="white"
        castShadow
      />
      <ambientLight intensity={5} position={[0, 10, 0]} />
      {
        <GizmoHelper
          alignment="bottom-right" // widget alignment within scene
          margin={[80, 80]} // widget margins (X, Y)
        >
          <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="black" />
        </GizmoHelper>
      }
      {
        <Effects />
      }
    </>
  )
}

export default Experience