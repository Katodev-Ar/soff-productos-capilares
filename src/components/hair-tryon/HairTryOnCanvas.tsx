'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Camera,
  Upload,
  User,
  Sparkles,
  CameraOff,
  FlipHorizontal,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  SplitSquareVertical,
  CheckCircle2,
} from 'lucide-react'
import { HairColorShade, InputMode } from './types'

interface HairTryOnCanvasProps {
  selectedShade: HairColorShade | null
  intensity: number
  lightnessLift: number
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '')
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export default function HairTryOnCanvas({
  selectedShade,
  intensity,
  lightnessLift,
}: HairTryOnCanvasProps) {
  // Modes & Status
  const [mode, setMode] = useState<InputMode>('sample')
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [modelError, setModelError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [isMirror, setIsMirror] = useState(true)

  // Interactive controls
  const [splitMode, setSplitMode] = useState(false)
  const [splitPosition, setSplitPosition] = useState(0.5)
  const [showOriginal, setShowOriginal] = useState(false)
  const [selectedSample, setSelectedSample] = useState('/samples/model1.jpg')

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenImageDataRef = useRef<ImageData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // MediaPipe task references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmenterRef = useRef<any>(null)
  const currentRunningModeRef = useRef<'VIDEO' | 'IMAGE'>('IMAGE')
  const animFrameIdRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cache for static photo segmentation
  const staticImageRef = useRef<HTMLImageElement | null>(null)
  const staticMaskDataRef = useRef<Float32Array | null>(null)
  const staticMaskDimsRef = useRef<{ width: number; height: number } | null>(null)

  // 1. Initialize MediaPipe Hair Segmenter
  useEffect(() => {
    let isMounted = true

    async function initMediaPipe() {
      try {
        setIsModelLoading(true)
        setModelError(null)

        // Dynamic import to prevent Next.js SSR evaluation errors
        const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')

        // Resolve WASM binaries (first try local /wasm, then jsdelivr CDN fallback)
        let vision: any
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm')
        } catch {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          )
        }

        if (!isMounted) return

        // Create segmenter with model
        const segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/hair_segmenter.tflite',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        })

        if (!isMounted) {
          segmenter.close()
          return
        }

        segmenterRef.current = segmenter
        currentRunningModeRef.current = 'IMAGE'
        setIsModelLoading(false)

        // Automatically trigger initial sample photo
        loadSampleImage('/samples/model1.jpg')
      } catch (err: any) {
        console.error('Error initializing MediaPipe Hair Segmenter:', err)
        if (isMounted) {
          setModelError(
            'No se pudo inicializar el modelo de segmentación capilar. Verifique la compatibilidad WebGL de su navegador.'
          )
          setIsModelLoading(false)
        }
      }
    }

    initMediaPipe()

    return () => {
      isMounted = false
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close()
        } catch {
          // ignore
        }
      }
      stopCameraStream()
    }
  }, [])

  // 2. Stop camera utility
  const stopCameraStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // 3. Composite Hair Layer Function
  const renderCompositedFrame = useCallback(
    (
      source: CanvasImageSource,
      maskData: Float32Array,
      maskW: number,
      maskH: number,
      targetW: number,
      targetH: number,
      mirror: boolean
    ) => {
      const mainCanvas = mainCanvasRef.current
      if (!mainCanvas) return
      const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: false })
      if (!mainCtx) return

      if (mainCanvas.width !== targetW || mainCanvas.height !== targetH) {
        mainCanvas.width = targetW
        mainCanvas.height = targetH
      }

      // Initialize or resize offscreen canvas
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas')
      }
      const offCanvas = offscreenCanvasRef.current
      if (offCanvas.width !== maskW || offCanvas.height !== maskH) {
        offCanvas.width = maskW
        offCanvas.height = maskH
        offscreenImageDataRef.current = offCanvas
          .getContext('2d', { willReadFrequently: true })!
          .createImageData(maskW, maskH)
      }
      const offCtx = offCanvas.getContext('2d')
      const imgData = offscreenImageDataRef.current
      if (!offCtx || !imgData) return

      // Populate tinted hair mask ImageData
      const rgb = selectedShade ? hexToRgb(selectedShade.hex) : { r: 0, g: 0, b: 0 }
      const data = imgData.data

      for (let i = 0; i < maskData.length; i++) {
        const conf = maskData[i]
        let alpha = 0
        // Soft-threshold between 0.15 and 0.85 for anti-aliased hair strands
        if (conf > 0.15) {
          const norm = Math.min(1, (conf - 0.15) / 0.7)
          alpha = Math.round(norm * 255)
        }
        const idx = i * 4
        data[idx] = rgb.r
        data[idx + 1] = rgb.g
        data[idx + 2] = rgb.b
        data[idx + 3] = alpha
      }
      offCtx.putImageData(imgData, 0, 0)

      // Step A: Draw Original Image/Video to Main Canvas
      mainCtx.save()
      if (mirror) {
        mainCtx.translate(targetW, 0)
        mainCtx.scale(-1, 1)
      }
      mainCtx.drawImage(source, 0, 0, targetW, targetH)
      mainCtx.restore()

      // If user holds "Ver original" or no shade is selected, we're done!
      if (showOriginal || !selectedShade) {
        return
      }

      // Step B: Hair Recoloring Compositing
      mainCtx.save()

      // Handle split slider mode
      if (splitMode) {
        mainCtx.beginPath()
        mainCtx.rect(targetW * splitPosition, 0, targetW * (1 - splitPosition), targetH)
        mainCtx.clip()
      }

      // If mirrored, flip the tinted hair overlay to match
      if (mirror) {
        mainCtx.translate(targetW, 0)
        mainCtx.scale(-1, 1)
      }

      // 1. Primary blend: 'color' (Preserves luminosity, highlights and hair texture)
      mainCtx.globalAlpha = intensity
      mainCtx.globalCompositeOperation = 'color'
      mainCtx.drawImage(offCanvas, 0, 0, targetW, targetH)

      // 2. Secondary blend: 'soft-light' for lightening dark hair (blonde/copper lift)
      const combinedLift = (selectedShade.lightnessAdjustment || 0) * 0.5 + lightnessLift * 0.5
      if (combinedLift > 0.05) {
        mainCtx.globalAlpha = intensity * combinedLift * 0.65
        mainCtx.globalCompositeOperation = 'soft-light'
        mainCtx.drawImage(offCanvas, 0, 0, targetW, targetH)
      }

      mainCtx.restore()

      // Draw split divider line if split mode is active
      if (splitMode) {
        mainCtx.save()
        mainCtx.strokeStyle = '#ffffff'
        mainCtx.lineWidth = 3
        mainCtx.shadowColor = 'rgba(0,0,0,0.5)'
        mainCtx.shadowBlur = 6
        mainCtx.beginPath()
        mainCtx.moveTo(targetW * splitPosition, 0)
        mainCtx.lineTo(targetW * splitPosition, targetH)
        mainCtx.stroke()

        // Labels
        mainCtx.fillStyle = 'rgba(0,0,0,0.65)'
        mainCtx.fillRect(10, targetH - 34, 80, 24)
        mainCtx.fillRect(targetW - 90, targetH - 34, 80, 24)

        mainCtx.fillStyle = '#ffffff'
        mainCtx.font = 'bold 11px sans-serif'
        mainCtx.fillText('ORIGINAL', 20, targetH - 18)
        mainCtx.fillText('CON COLOR', targetW - 82, targetH - 18)
        mainCtx.restore()
      }
    },
    [selectedShade, intensity, lightnessLift, showOriginal, splitMode, splitPosition]
  )

  // 4. Video processing loop for Camera mode
  const processVideoFrame = useCallback(() => {
    const video = videoRef.current
    const segmenter = segmenterRef.current
    if (!video || !segmenter || video.readyState < 2 || video.paused || video.ended) {
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame)
      return
    }

    const timestamp = performance.now()
    try {
      segmenter.segmentForVideo(video, timestamp, (result: any) => {
        const maskObj =
          result.confidenceMasks && result.confidenceMasks.length > 1
            ? result.confidenceMasks[1]
            : result.confidenceMasks?.[0]

        if (maskObj) {
          const maskData = maskObj.getAsFloat32Array()
          renderCompositedFrame(
            video,
            maskData,
            maskObj.width,
            maskObj.height,
            video.videoWidth || 640,
            video.videoHeight || 480,
            isMirror
          )
        }
      })
    } catch (e) {
      console.error('segmentForVideo error:', e)
    }

    animFrameIdRef.current = requestAnimationFrame(processVideoFrame)
  }, [renderCompositedFrame, isMirror])

  // 5. Start Camera
  const startCamera = async (newFacingMode = facingMode) => {
    stopCameraStream()
    setCameraError(null)
    setMode('camera')

    try {
      const segmenter = segmenterRef.current
      if (segmenter && currentRunningModeRef.current !== 'VIDEO') {
        await segmenter.setOptions({ runningMode: 'VIDEO' })
        currentRunningModeRef.current = 'VIDEO'
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => {
          animFrameIdRef.current = requestAnimationFrame(processVideoFrame)
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError(
        'No se pudo acceder a la cámara. Verifique que los permisos estén habilitados o intente probando con una foto.'
      )
    }
  }

  // 6. Segment and Render a Static Image (Upload or Sample)
  const processStaticImage = useCallback(
    async (img: HTMLImageElement) => {
      const segmenter = segmenterRef.current
      if (!segmenter) return

      try {
        if (currentRunningModeRef.current !== 'IMAGE') {
          await segmenter.setOptions({ runningMode: 'IMAGE' })
          currentRunningModeRef.current = 'IMAGE'
        }

        segmenter.segment(img, (result: any) => {
          const maskObj =
            result.confidenceMasks && result.confidenceMasks.length > 1
              ? result.confidenceMasks[1]
              : result.confidenceMasks?.[0]

          if (maskObj) {
            const maskData = maskObj.getAsFloat32Array()
            staticMaskDataRef.current = maskData
            staticMaskDimsRef.current = { width: maskObj.width, height: maskObj.height }
            staticImageRef.current = img

            renderCompositedFrame(
              img,
              maskData,
              maskObj.width,
              maskObj.height,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height,
              false
            )
          }
        })
      } catch (err) {
        console.error('Error segmenting static image:', err)
      }
    },
    [renderCompositedFrame]
  )

  // 7. Load Sample Image
  const loadSampleImage = useCallback(
    (src: string) => {
      stopCameraStream()
      setMode('sample')
      setSelectedSample(src)

      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      img.onload = () => {
        processStaticImage(img)
      }
    },
    [stopCameraStream, processStaticImage]
  )

  // 8. Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    stopCameraStream()
    setMode('upload')

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.src = event.target?.result as string
      img.onload = () => {
        processStaticImage(img)
      }
    }
    reader.readAsDataURL(file)
  }

  // 9. When color / sliders change on static photo mode, re-composite immediately!
  useEffect(() => {
    if (
      mode !== 'camera' &&
      staticImageRef.current &&
      staticMaskDataRef.current &&
      staticMaskDimsRef.current
    ) {
      renderCompositedFrame(
        staticImageRef.current,
        staticMaskDataRef.current,
        staticMaskDimsRef.current.width,
        staticMaskDimsRef.current.height,
        staticImageRef.current.naturalWidth || staticImageRef.current.width,
        staticImageRef.current.naturalHeight || staticImageRef.current.height,
        false
      )
    }
  }, [
    selectedShade,
    intensity,
    lightnessLift,
    showOriginal,
    splitMode,
    splitPosition,
    mode,
    renderCompositedFrame,
  ])

  // 10. Switch Camera Front / Back
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)
    setIsMirror(nextFacing === 'user')
    startCamera(nextFacing)
  }

  // 11. Download Photo
  const handleDownloadSnapshot = () => {
    const canvas = mainCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `soff-look-${selectedShade?.name || 'color'}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
  }

  return (
    <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden flex flex-col">
      {/* Top Bar: Input Mode Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50/70 border-b border-gray-100">
        <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => loadSampleImage('/samples/model1.jpg')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              mode === 'sample'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Modelos de Prueba
          </button>

          <button
            onClick={() => startCamera('user')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              mode === 'camera'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Cámara en Vivo
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              mode === 'upload'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Foto
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Action Buttons: Split Before/After, Original, Download */}
        <div className="flex items-center gap-2">
          {mode === 'camera' && (
            <button
              onClick={toggleCameraFacing}
              title="Cambiar entre cámara frontal y trasera"
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-xs flex items-center gap-1"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setSplitMode(!splitMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              splitMode
                ? 'bg-[#e88baf] text-white border-[#e88baf]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            {splitMode ? 'Split Activo' : 'Antes / Después'}
          </button>

          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition select-none"
            title="Mantener presionado para ver el cabello original"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            Ver Original
          </button>

          <button
            onClick={handleDownloadSnapshot}
            className="p-2 rounded-xl bg-black text-white hover:bg-[#e88baf] hover:text-black transition"
            title="Descargar Foto"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative bg-neutral-900 flex items-center justify-center min-h-[420px] sm:min-h-[520px] max-h-[640px] overflow-hidden">
        {/* Hidden video element for webcam feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="hidden"
        />

        {/* Display Canvas with hair recoloring */}
        <canvas
          ref={mainCanvasRef}
          className="max-h-[640px] w-auto max-w-full object-contain mx-auto transition-transform"
        />

        {/* Split slider overlay when Split mode is active */}
        {splitMode && (
          <div className="absolute inset-x-0 bottom-4 px-6 flex items-center gap-3 bg-black/60 backdrop-blur-md py-2.5 mx-auto max-w-md rounded-2xl border border-white/10">
            <span className="text-[11px] text-white/80 font-semibold whitespace-nowrap">
              Deslizar división
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={splitPosition}
              onChange={(e) => setSplitPosition(parseFloat(e.target.value))}
              className="w-full accent-[#e88baf] cursor-pointer h-1.5 bg-white/30 rounded-lg"
            />
          </div>
        )}

        {/* Loading Spinner */}
        {isModelLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6 z-20 backdrop-blur-xs">
            <Loader2 className="w-10 h-10 text-[#e88baf] animate-spin mb-3" />
            <p className="font-semibold text-sm">Cargando motor de IA Capilar...</p>
            <p className="text-xs text-white/60 mt-1">
              Descargando modelo local MediaPipe (~760 KB)
            </p>
          </div>
        )}

        {/* Model Error Card */}
        {modelError && (
          <div className="absolute inset-6 m-auto max-w-md bg-white rounded-2xl p-6 text-center shadow-2xl z-20 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <h4 className="font-bold text-gray-900 text-sm mb-1">Error de Inicialización</h4>
            <p className="text-xs text-gray-600 mb-4">{modelError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Camera Permission / Error Card */}
        {cameraError && (
          <div className="absolute inset-6 m-auto max-w-md bg-white rounded-2xl p-6 text-center shadow-2xl z-20 flex flex-col items-center justify-center">
            <CameraOff className="w-10 h-10 text-amber-500 mb-2" />
            <h4 className="font-bold text-gray-900 text-sm mb-1">Cámara no disponible</h4>
            <p className="text-xs text-gray-600 mb-4">{cameraError}</p>
            <div className="flex gap-2">
              <button
                onClick={() => loadSampleImage('/samples/model1.jpg')}
                className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-[#e88baf] hover:text-black transition"
              >
                Probar con Modelo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Subir una foto
              </button>
            </div>
          </div>
        )}

        {/* Live Shade Badge Overlay */}
        {selectedShade && !isModelLoading && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white flex items-center gap-2 pointer-events-none">
            <span
              className="w-3 h-3 rounded-full border border-white/50"
              style={{ backgroundColor: selectedShade.hex }}
            />
            <span className="text-xs font-medium">
              {selectedShade.name} ({selectedShade.toneCode})
            </span>
          </div>
        )}
      </div>

      {/* Sample Models Bar (when sample mode is active) */}
      {mode === 'sample' && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border-t border-gray-100 overflow-x-auto text-xs">
          <span className="font-semibold text-gray-600 whitespace-nowrap">
            Seleccionar retrato:
          </span>
          <button
            onClick={() => loadSampleImage('/samples/model1.jpg')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              selectedSample === '/samples/model1.jpg'
                ? 'bg-white border-[#e88baf] text-[#e88baf] shadow-xs font-bold'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Retrato Castaño (Muestra 1)
          </button>
          <button
            onClick={() => loadSampleImage('/samples/model2.jpg')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              selectedSample === '/samples/model2.jpg'
                ? 'bg-white border-[#e88baf] text-[#e88baf] shadow-xs font-bold'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Retrato Rubio (Muestra 2)
          </button>
        </div>
      )}
    </div>
  )
}
