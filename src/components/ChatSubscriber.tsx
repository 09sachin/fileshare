import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, User, Download, Paperclip } from 'lucide-react'
import { ChatWebRTCManager } from '../utils/chatWebRTC'
import { ChatMessage, ChatSignalData } from '../types'
import QRCodeDisplay from './QRCodeDisplay'
import QRCodeScanner from './QRCodeScanner'

interface ChatSubscriberProps {
  onBack: () => void
}

const ChatSubscriber: React.FC<ChatSubscriberProps> = ({ onBack }) => {
  const [step, setStep] = useState<'setup' | 'connecting' | 'answer' | 'connected'>('setup')
  const [answerData, setAnswerData] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [subscriberName, setSubscriberName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fileProgress, setFileProgress] = useState<{ percentage: number, fileName: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new messages
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  // Handle connection
  const handleConnected = useCallback(() => {
    setStep('connected')
  }, [])

  // Handle disconnection
  const handleDisconnected = useCallback(() => {
    setError('Connection lost. Please try to reconnect.')
  }, [])

  // Handle file progress
  const handleFileProgress = useCallback((progress: { percentage: number, fileName: string }) => {
    setFileProgress(progress)
    if (progress.percentage >= 100) {
      setTimeout(() => {
        setFileProgress(null)
      }, 1000)
    }
  }, [])

  // Join chat room
  const joinRoom = async () => {
    if (!subscriberName.trim()) {
      setError('Please enter your name')
      return
    }

    setStep('connecting')
    setError(null)
  }

  // Handle host offer
  const handleOfferReceived = useCallback(async (offerText: string) => {
    try {
      setError(null)
      
      const offerData: ChatSignalData = JSON.parse(offerText)
      console.log('Subscriber: Processing host offer')
      
      const manager = new ChatWebRTCManager(
        false, // isHost
        subscriberName,
        handleMessage,
        undefined, // onSubscriberJoined
        undefined, // onSubscriberLeft
        handleConnected,
        handleDisconnected,
        handleFileProgress // File progress callback
      )

      const signalData = await manager.createAnswer(offerData)
      
      setAnswerData(JSON.stringify(signalData))
      setStep('answer')
      
    } catch (error) {
      console.error('Failed to process offer:', error)
      setError('Failed to connect to chat room. Please check the QR code and try again.')
      setStep('setup')
    }
  }, [subscriberName, handleMessage, handleConnected, handleDisconnected, handleFileProgress])

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 p-2 rounded-full">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-gray-800">Chat Subscriber</h2>
              <p className="text-sm text-gray-600">
                {step === 'setup' && 'Enter your name to join a chat room'}
                {step === 'connecting' && 'Ready to join - scan host QR code'}
                {step === 'answer' && 'Share your response with the host'}
                {step === 'connected' && `Connected as ${subscriberName}`}
              </p>
            </div>
          </div>
          <button onClick={onBack} className="text-sm text-blue-500 hover:text-blue-600">
            Back to Menu
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step 1: Setup - Enter name */}
      {step === 'setup' && (
        <div className="card">
          <div className="text-center mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Join Chat Room</h3>
            <p className="text-sm text-gray-600">Enter your name to join a chat room</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name (e.g., John, Sarah)"
              value={subscriberName}
              onChange={(e) => setSubscriberName(e.target.value)}
              className="input-field"
              maxLength={30}
            />
            
            <button
              onClick={joinRoom}
              disabled={!subscriberName.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Connecting - Scan host QR code */}
      {step === 'connecting' && (
        <QRCodeScanner
          onScan={handleOfferReceived}
          title="Scan Host's QR Code"
          description="Scan the QR code from the chat room host to join"
        />
      )}

      {/* Step 3: Answer - Show response QR code */}
      {step === 'answer' && (
        <div className="space-y-4">
          <div className="card">
            <div className="text-center mb-4">
              <h3 className="font-medium text-gray-800 mb-2">Almost There!</h3>
              <p className="text-sm text-gray-600">
                You're about to join the chat room. Share this QR code with the host to complete the connection.
              </p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your name:</strong> {subscriberName}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Status:</strong> Waiting for host to scan your response
              </p>
            </div>
          </div>

          <QRCodeDisplay
            data={answerData}
            title="Your Connection Response"
            description="Share this QR code with the host to complete the connection"
          />
        </div>
      )}

      {/* Step 4: Connected - Chat interface */}
      {step === 'connected' && (
        <div className="space-y-4">
          {/* Connection status */}
          <div className="card">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-600">
                Connected to chat room
              </span>
            </div>
          </div>

          {/* Chat messages */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-3">
              <MessageCircle className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-800">Messages</h3>
            </div>
            
            <div className="space-y-3">
              {/* Messages container */}
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    No messages yet. Wait for the host to send messages!
                  </p>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      className={`flex ${message.sender === 'subscriber' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.subscriberId === 'system' 
                          ? 'bg-yellow-100 text-yellow-800 text-center text-sm'
                          : message.sender === 'host' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-800'
                      }`}>
                        {message.subscriberId !== 'system' && message.sender === 'host' && (
                          <div className="text-xs text-blue-100 mb-1">Host</div>
                        )}
                        <div className="text-sm">{message.content}</div>
                        {message.type === 'file' && message.fileData && (
                          <div className="mt-2 p-2 bg-black bg-opacity-20 rounded text-xs">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-3 w-3" />
                              <span>{message.fileData.name}</span>
                            </div>
                            <div className="text-gray-300 mt-1">
                              {(message.fileData.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                            {message.fileData.url && (
                              <a
                                href={message.fileData.url}
                                download={message.fileData.name}
                                className="inline-flex items-center space-x-1 mt-2 text-blue-200 hover:text-blue-100 text-xs"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </a>
                            )}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${
                          message.subscriberId === 'system' 
                            ? 'text-yellow-600'
                            : message.sender === 'host' 
                              ? 'text-blue-100' 
                              : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* File download progress */}
              {fileProgress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Download className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Downloading {fileProgress.fileName}...
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileProgress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {fileProgress.percentage}% complete
                  </div>
                </div>
              )}

              {/* Info message */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  📢 This is a broadcast chat. Only the host can send messages.
                </p>
              </div>
            </div>
          </div>

          {/* Connection info */}
          <div className="card">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                You are connected as <strong>{subscriberName}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The host will broadcast messages to all subscribers
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatSubscriber 