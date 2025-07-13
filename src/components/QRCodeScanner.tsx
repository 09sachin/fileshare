import React, { useState, useRef, useEffect } from 'react'
import { AlertCircle, Smartphone, Camera, CameraOff, X } from 'lucide-react'
import QrScanner from 'qr-scanner'

interface QRCodeScannerProps {
  onScan: (data: string) => void
  title: string
  description: string
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, title, description }) => {
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    // Check for camera availability
    console.log('Checking camera availability...')
    QrScanner.hasCamera()
      .then((cameraAvailable) => {
        console.log('Camera available:', cameraAvailable)
        setHasCamera(cameraAvailable)
      })
      .catch((error) => {
        console.error('Camera check failed:', error)
        setHasCamera(false)
      })
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy()
      }
    }
  }, [])

  const startScanning = async () => {
    if (!videoRef.current) {
      setError('Video element not found')
      return
    }
    
    if (!hasCamera) {
      setError('No camera available on this device')
      return
    }
    
    try {
      setError(null)
      setIsScanning(true)
      
      console.log('Starting QR scanner...')
      console.log('Video element found:', videoRef.current)
      
      // Create QR scanner instance with enhanced settings
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR code scanned successfully:', result.data)
          try {
            // Validate that it's JSON before passing to onScan
            JSON.parse(result.data)
            onScan(result.data)
            stopScanning()
          } catch (error) {
            console.log('Scanned data is not valid JSON, continuing to scan...')
          }
        },
        {
          onDecodeError: (error) => {
            // Show some decode attempts for debugging
            console.debug('QR decode attempt:', typeof error === 'string' ? error : error.message)
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 10, // Increased scan rate
          calculateScanRegion: (video) => {
            // Use the entire video area for scanning
            return {
              x: 0,
              y: 0,
              width: video.videoWidth,
              height: video.videoHeight,
            }
          }
        }
      )
      
      scannerRef.current = scanner
      
      // Start the scanner
      await scanner.start()
      console.log('QR scanner started successfully')
      
      // Additional debugging - check video stream
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          console.log('Video playing:', !videoRef.current.paused)
          console.log('Video ready state:', videoRef.current.readyState)
        }
      }, 1000)
      
    } catch (error: any) {
      console.error('Failed to start QR scanner:', error)
      
      // More specific error messages
      if (error.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.')
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else if (error.name === 'NotSupportedError') {
        setError('Camera is not supported in this browser.')
      } else if (error.name === 'NotReadableError') {
        setError('Camera is already in use by another application.')
      } else {
        setError(`Camera error: ${error.message || 'Please check camera permissions and try again.'}`)
      }
      
      setIsScanning(false)
      scannerRef.current = null
    }
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      try {
        // Validate JSON
        JSON.parse(manualInput.trim())
        onScan(manualInput.trim())
        setManualInput('')
        setError(null)
      } catch (error) {
        setError('Invalid format. Please paste valid connection data.')
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleManualSubmit()
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-4">
        <h3 className="font-medium text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Manual Input (Primary Option) */}
      {!showCamera && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Connection Data
              </span>
            </div>
            
            <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-600 mb-2">
                📋 Ask the other person to copy their connection data and share it with you (via message, email, etc.)
              </p>
              <div className="text-xs text-gray-500">
                💡 Tip: Press Ctrl+Enter to connect quickly
              </div>
            </div>
            
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Paste the connection data here..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Connect
              </button>
              {hasCamera && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="btn-secondary text-sm flex items-center space-x-1"
                >
                  <Camera className="h-3 w-3" />
                  <span>Camera</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Option (Secondary) */}
      {showCamera && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  QR Code Scanner
                </span>
              </div>
              <button
                onClick={() => {
                  stopScanning()
                  setShowCamera(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-green-600">
              Point your camera at the QR code to scan
            </p>
          </div>
          
          {/* Always render video element when camera mode is active */}
          <div className={`relative bg-black rounded-lg overflow-hidden ${isScanning ? '' : 'h-64 flex items-center justify-center'}`}>
            <video 
              ref={videoRef}
              className={`w-full object-cover ${isScanning ? 'h-64' : 'hidden'}`}
              autoPlay
              playsInline
              muted
            />
            
            {isScanning && (
              <>
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white"></div>
                  </div>
                </div>
                
                {/* Scanning status indicator */}
                <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  🔍 Scanning...
                </div>
                
                <button
                  onClick={stopScanning}
                  className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <CameraOff className="h-4 w-4" />
                </button>
              </>
            )}
            
            {!isScanning && (
              <div className="text-center space-y-3 p-6">
                <div className="text-xs text-gray-500 mb-2">
                  Camera status: {hasCamera ? '✅ Available' : '❌ Not available'}
                </div>
                <button
                  onClick={() => {
                    console.log('Start Camera button clicked')
                    console.log('hasCamera:', hasCamera)
                    console.log('videoRef.current:', videoRef.current)
                    startScanning()
                  }}
                  disabled={!hasCamera}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="h-4 w-4 mr-2 inline" />
                  {hasCamera ? 'Start Camera' : 'Camera Not Available'}
                </button>
                
                {/* Debug button to force try camera */}
                {!hasCamera && (
                  <button
                    onClick={() => {
                      console.log('Force trying camera...')
                      setHasCamera(true)
                      setTimeout(() => startScanning(), 100)
                    }}
                    className="w-full btn-secondary text-xs text-gray-600"
                  >
                    🔧 Force Try Camera (Debug)
                  </button>
                )}
                
                <button
                  onClick={() => setShowCamera(false)}
                  className="w-full btn-secondary text-sm"
                >
                  ← Back to Manual Input
                </button>
              </div>
            )}
          </div>
          
          {isScanning && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                📱 Hold steady and position the QR code within the white frame
              </p>
              <p className="text-xs text-gray-500">
                💡 Make sure the QR code is well-lit and not blurry
              </p>
              <button
                onClick={() => setShowCamera(false)}
                className="btn-secondary text-sm"
              >
                Switch to Manual Input
              </button>
            </div>
          )}
        </div>
      )}

      {!hasCamera && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <AlertCircle className="h-4 w-4 text-yellow-600 mx-auto mb-2" />
          <p className="text-sm text-yellow-800">Camera not available on this device</p>
          <p className="text-xs text-yellow-600 mt-1">Please use manual input method</p>
        </div>
      )}

      {error && (
        <div className="error-message mt-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}

export default QRCodeScanner