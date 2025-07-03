import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { GenericStore } from './GenericStore'

interface PerformanceMetrics {
  fps: number
  avgFps: number
  minFps: number
  maxFps: number
  frameTime: number
  memoryUsage?: number
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgFps: 0,
    minFps: Infinity,
    maxFps: 0,
    frameTime: 0
  })

  const fpsHistory = useRef<number[]>([])
  const frameCount = useRef(0)
  const lastTime = useRef(0)
  const lastUpdate = useRef(0)

  // Track frame rate
  useFrame((_, delta) => {
    frameCount.current++
    const now = performance.now()
    
    if (lastTime.current === 0) {
      lastTime.current = now
      return
    }

    const fps = 1 / delta
    const frameTime = delta * 1000 // Convert to milliseconds
    
    fpsHistory.current.push(fps)
    
    // Keep only last 60 frames for average calculation
    if (fpsHistory.current.length > 60) {
      fpsHistory.current.shift()
    }

    // Update metrics every 500ms
    if (now - lastUpdate.current > 500) {
      const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
      const minFps = Math.min(...fpsHistory.current)
      const maxFps = Math.max(...fpsHistory.current)
      
      let memoryUsage: number | undefined
      if ('memory' in performance) {
        memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024) // MB
      }

      setMetrics({
        fps: Math.round(fps),
        avgFps: Math.round(avgFps),
        minFps: Math.round(minFps),
        maxFps: Math.round(maxFps),
        frameTime: Math.round(frameTime * 100) / 100,
        memoryUsage: memoryUsage ? Math.round(memoryUsage) : undefined
      })

      lastUpdate.current = now
    }
  })

  // Log performance summary every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (fpsHistory.current.length > 0) {
        const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
        console.log(`🚀 Performance Summary:`, {
          'Average FPS': Math.round(avgFps),
          'Min FPS': Math.round(Math.min(...fpsHistory.current)),
          'Max FPS': Math.round(Math.max(...fpsHistory.current)),
          'Total Frames': frameCount.current,
          'Memory (MB)': metrics.memoryUsage || 'N/A'
        })
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [metrics.memoryUsage])

  // Display performance overlay when FPS meter is enabled
  const showFPSMeter = GenericStore((state) => state.isFPSMeterVisible)

  if (!showFPSMeter) return null

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '150px'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
        Performance Monitor
      </div>
      <div>FPS: <span style={{ color: metrics.fps < 30 ? '#ff4444' : metrics.fps < 50 ? '#ffaa44' : '#44ff44' }}>
        {metrics.fps}
      </span></div>
      <div>Avg: {metrics.avgFps}</div>
      <div>Min: {metrics.minFps === Infinity ? 0 : metrics.minFps}</div>
      <div>Max: {metrics.maxFps}</div>
      <div>Frame Time: {metrics.frameTime}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {metrics.memoryUsage}MB</div>
      )}
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Frames: {frameCount.current}
      </div>
    </div>
  )
}

export default PerformanceMonitor