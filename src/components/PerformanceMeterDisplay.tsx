import { useFrame } from "@react-three/fiber"
import { Perf } from "r3f-perf"
import { useEffect, useState } from "react"
import Stats from 'three/examples/jsm/libs/stats.module.js'

export const PerformanceMeterDisplay = () => {
  const [memoryStatsPanel, setMemoryStatsPanel] = useState<Stats | null>(null)

  useEffect(() => {
    if (memoryStatsPanel === null) {
      // @ts-ignore
      const memoryStats = new Stats()
      memoryStats.showPanel(2)
      document.body.appendChild(memoryStats.dom)
      setMemoryStatsPanel(memoryStats)
    }

    return () => {
      if (memoryStatsPanel) {
        document.body.removeChild(memoryStatsPanel.dom)
      }
    }
  }, [memoryStatsPanel])

  useFrame(() => {
    if (memoryStatsPanel) {
      // @ts-ignore
      memoryStatsPanel.update()
    }
  })

  return (
    <Perf
      deepAnalyse={true}
      overClock={true}
      matrixUpdate={true}
      position='top-left'
      logsPerSecond={5}
      style={{
        position: 'absolute',
        left: '30%',
      }}
    />
  )
}