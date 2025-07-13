import React, { useState, useCallback } from 'react'
import { Download, CheckCircle, AlertCircle, FileText, Loader } from 'lucide-react'
import { WebRTCManager } from '../utils/webrtc'
import { useFileTransfer } from '../contexts/FileTransferContext'
import QRCodeDisplay from './QRCodeDisplay'
import QRCodeScanner from './QRCodeScanner'
import ProgressBar from './ProgressBar'
import { SignalData } from '../types'

interface ReceiverProps {
  onConnectionChange: (connected: boolean) => void
}

const Receiver: React.FC<ReceiverProps> = ({ onConnectionChange }) => {
  const [step, setStep] = useState<'scan' | 'answer' | 'transfer' | 'complete'>('scan')
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null)
  const [answerData, setAnswerData] = useState<string>('')
  const [receivedFile, setReceivedFile] = useState<File | null>(null)
  const [incomingFileInfo, setIncomingFileInfo] = useState<{name: string, size: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const { progress, setProgress, setIsTransferring } = useFileTransfer()

  const handleOfferReceived = useCallback(async (offerText: string) => {
    try {
      setError(null)
      
      console.log('Receiver: Processing offer data:', offerText.substring(0, 100) + '...')
      
      const offerData: SignalData = JSON.parse(offerText)
      console.log('Receiver: Parsed offer data:', offerData)
      
      // Extract file info from metadata if available
      if (offerData.metadata) {
        console.log('Receiver: Found file metadata:', offerData.metadata)
        setIncomingFileInfo({
          name: offerData.metadata.name,
          size: offerData.metadata.size
        })
      }

      console.log('Receiver: Creating WebRTC manager...')
      const manager = new WebRTCManager(
        false, // isInitiator
        setProgress,
        (file: File) => {
          console.log('Receiver: File received:', file.name, file.size)
          setReceivedFile(file)
          setStep('complete')
          setIsTransferring(false)
          setIsConnecting(false)
        },
        () => {
          console.log('Receiver: WebRTC connected')
          onConnectionChange(true)
          setIsConnecting(false)
          setStep('transfer')
          setIsTransferring(true)
        },
        () => {
          console.log('Receiver: WebRTC disconnected')
          onConnectionChange(false)
          setIsConnecting(false)
        }
      )

      console.log('Receiver: Creating peer and generating answer...')
      const signalData = await manager.createPeer()
      
      console.log('Receiver: Connecting to peer...')
      manager.connectToPeer(offerData)
      
      setWebrtcManager(manager)
      setAnswerData(JSON.stringify(signalData))
      setStep('answer')
      
      // Set connecting state only after a delay to ensure the answer is properly shared
      setTimeout(() => {
        if (manager && !manager.isConnected) {
          setIsConnecting(true)
        }
      }, 5000) // Give 5 seconds for the answer to be shared
      
    } catch (error) {
      console.error('Receiver: Failed to process offer:', error)
      setError('Invalid connection data. Please check the QR code or pasted data.')
      setIsConnecting(false)
    }
  }, [onConnectionChange, setProgress, setIsTransferring])

  const downloadFile = () => {
    if (!receivedFile) return
    
    const url = URL.createObjectURL(receivedFile)
    const a = document.createElement('a')
    a.href = url
    a.download = receivedFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    webrtcManager?.destroy()
    setWebrtcManager(null)
    setAnswerData('')
    setReceivedFile(null)
    setIncomingFileInfo(null)
    setError(null)
    setStep('scan')
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

      {/* Connection Status */}
      {isConnecting && (
        <div className="card">
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="text-sm">Waiting for sender to scan the response...</span>
          </div>
        </div>
      )}

      {/* Step 1: Scan Offer */}
      {step === 'scan' && (
        <QRCodeScanner
          onScan={handleOfferReceived}
          title="Scan Sender's QR Code"
          description="Scan the QR code from the sender to start receiving files"
        />
      )}

      {/* Step 2: Show Answer */}
      {step === 'answer' && (
        <div className="space-y-4">
          {/* File Info */}
          {incomingFileInfo && (
            <div className="card">
              <div className="text-center mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Incoming File</h3>
                <p className="text-sm text-gray-600">The sender wants to share a file with you</p>
              </div>
              
              <div className="file-card">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-800">{incomingFileInfo.name}</p>
                    <p className="text-sm text-gray-600">{formatFileSize(incomingFileInfo.size)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Answer QR Code */}
          <QRCodeDisplay
            data={answerData}
            title="Connection Response"
            description="Share this QR code or connection data with the sender to complete the connection"
          />
        </div>
      )}

      {/* Step 3: Transfer Progress */}
      {step === 'transfer' && (
        <div className="card">
          <div className="text-center mb-4">
            <h3 className="font-medium text-gray-800 mb-2">Receiving File</h3>
            <p className="text-sm text-gray-600">
              Downloading {incomingFileInfo?.name || 'file'} from sender
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

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="card">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium text-gray-800 mb-2">File Received!</h3>
            <p className="text-sm text-gray-600 mb-4">
              {receivedFile?.name} has been received successfully
            </p>
            
            {receivedFile && (
              <div className="space-y-3">
                <div className="file-card">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-800">{receivedFile.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(receivedFile.size)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button onClick={downloadFile} className="btn-primary flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button onClick={reset} className="btn-secondary">
                    Receive Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Receiver