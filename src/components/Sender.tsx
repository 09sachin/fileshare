import React, { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, Trash2 } from 'lucide-react'
import { WebRTCManager } from '../utils/webrtc'
import { useFileTransfer } from '../contexts/FileTransferContext'
import QRCodeDisplay from './QRCodeDisplay'
import QRCodeScanner from './QRCodeScanner'
import ProgressBar from './ProgressBar'
import { SignalData } from '../types'

interface SenderProps {
  onConnectionChange: (connected: boolean) => void
}

const Sender: React.FC<SenderProps> = ({ onConnectionChange }) => {
  const [step, setStep] = useState<'select' | 'offer' | 'answer' | 'transfer' | 'complete'>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null)
  const [offerData, setOfferData] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { progress, setProgress, setIsTransferring } = useFileTransfer()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (limit to 100MB for better performance)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size too large. Please select a file smaller than 100MB.')
        return
      }
      
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleFileSelectClick = () => {
    fileInputRef.current?.click()
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  const createOffer = useCallback(async () => {
    if (!selectedFile) return

    try {
      setIsConnecting(true)
      setError(null)
      
      const manager = new WebRTCManager(
        true, // isInitiator
        setProgress,
        undefined, // onFileReceived
        () => {
          console.log('Sender: WebRTC connected')
          onConnectionChange(true)
          setIsConnecting(false)
        },
        () => {
          console.log('Sender: WebRTC disconnected')
          onConnectionChange(false)
          setIsConnecting(false)
        }
      )

      const signalData = await manager.createPeer()
      
      // Add file metadata to the offer
      const offerWithMetadata = {
        ...signalData,
        metadata: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          chunks: Math.ceil(selectedFile.size / 16384)
        }
      }
      
      setWebrtcManager(manager)
      setOfferData(JSON.stringify(offerWithMetadata))
      setStep('offer')
    } catch (error) {
      console.error('Failed to create offer:', error)
      setError('Failed to create connection offer. Please try again.')
      setIsConnecting(false)
    }
  }, [selectedFile, onConnectionChange, setProgress])

  const handleAnswerReceived = useCallback(async (answerText: string) => {
    if (!webrtcManager) return

    try {
      setError(null)
      setIsConnecting(true)
      
      const answerData: SignalData = JSON.parse(answerText)
      console.log('Sender: Processing answer:', answerData)
      
      webrtcManager.connectToPeer(answerData)
      
      // Wait for connection to establish
      setTimeout(() => {
        if (webrtcManager.isConnected && selectedFile) {
          setStep('transfer')
          setIsTransferring(true)
          
          webrtcManager.sendFile(selectedFile)
            .then(() => {
              console.log('File sent successfully')
              setStep('complete')
              setIsTransferring(false)
            })
            .catch((error) => {
              console.error('Failed to send file:', error)
              setError('Failed to send file. Please try again.')
              setIsTransferring(false)
            })
        }
      }, 1000)
      
    } catch (error) {
      console.error('Failed to process answer:', error)
      setError('Invalid connection response. Please check the data and try again.')
      setIsConnecting(false)
    }
  }, [webrtcManager, selectedFile, setIsTransferring])

  const reset = () => {
    webrtcManager?.destroy()
    setWebrtcManager(null)
    setSelectedFile(null)
    setOfferData('')
    setError(null)
    setStep('select')
    setProgress(null)
    setIsTransferring(false)
    setIsConnecting(false)
    onConnectionChange(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step 1: File Selection */}
      {step === 'select' && (
        <div className="card">
          <div className="text-center mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Select File to Send</h3>
            <p className="text-sm text-gray-600">Choose a file to share with the receiver</p>
          </div>

          {!selectedFile ? (
            <div
              onClick={handleFileSelectClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">Click to select a file</p>
              <p className="text-xs text-gray-500">Max file size: 100MB</p>
            </div>
          ) : (
            <div className="file-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-800">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={removeSelectedFile}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile && (
            <div className="mt-4 text-center">
              <button
                onClick={createOffer}
                disabled={isConnecting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Creating Connection...' : 'Create Connection'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Show QR Code with Connection Data */}
      {step === 'offer' && (
        <QRCodeDisplay
          data={offerData}
          title="Connection Ready"
          description="Share this QR code or connection data with the receiver"
        />
      )}

      {/* Step 3: Wait for Answer */}
      {step === 'offer' && (
        <QRCodeScanner
          onScan={handleAnswerReceived}
          title="Scan Receiver's Response"
          description="Scan the QR code from the receiver to complete the connection"
        />
      )}

      {/* Step 4: File Transfer */}
      {step === 'transfer' && (
        <div className="card">
          <div className="text-center mb-4">
            <h3 className="font-medium text-gray-800 mb-2">Sending File</h3>
            <p className="text-sm text-gray-600">
              Transferring {selectedFile?.name} to the receiver
            </p>
          </div>

          {progress && (
            <ProgressBar 
              progress={progress.percentage}
              label={`${progress.sent}/${progress.total} chunks`}
            />
          )}
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <div className="card">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium text-gray-800 mb-2">Transfer Complete!</h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedFile?.name} has been sent successfully
            </p>
            <button onClick={reset} className="btn-primary">
              Send Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sender 