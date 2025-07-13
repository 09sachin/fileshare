import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Users, MessageCircle, QrCode, Paperclip, Upload, FolderOpen } from 'lucide-react'
import JSZip from 'jszip'
import { ChatWebRTCManager } from '../utils/chatWebRTC'
import { ChatMessage, Subscriber, ChatSignalData } from '../types'
import QRCodeDisplay from './QRCodeDisplay'
import QRCodeScanner from './QRCodeScanner'

interface ChatHostProps {
  onBack: () => void
}

const ChatHost: React.FC<ChatHostProps> = ({ onBack }) => {
  const [step, setStep] = useState<'setup' | 'waiting' | 'active'>('setup')
  const [chatManager, setChatManager] = useState<ChatWebRTCManager | null>(null)
  const [offerData, setOfferData] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fileProgress, setFileProgress] = useState<{ percentage: number, fileName: string } | null>(null)
  const [isSendingFile, setIsSendingFile] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [copyNotification, setCopyNotification] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new messages
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  // Handle new subscribers
  const handleSubscriberJoined = useCallback((subscriber: Subscriber) => {
    setSubscribers(prev => [...prev, subscriber])
    
    // Add system message
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `${subscriber.name} joined the chat`,
      timestamp: Date.now(),
      sender: 'host',
      subscriberId: 'system'
    }
    setMessages(prev => [...prev, systemMessage])
  }, [])

  // Handle subscriber leaving
  const handleSubscriberLeft = useCallback((subscriberId: string) => {
    const subscriber = subscribers.find(sub => sub.id === subscriberId)
    if (subscriber) {
      setSubscribers(prev => prev.filter(sub => sub.id !== subscriberId))
      
      // Add system message
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `${subscriber.name} left the chat`,
        timestamp: Date.now(),
        sender: 'host',
        subscriberId: 'system'
      }
      setMessages(prev => [...prev, systemMessage])
    }
  }, [subscribers])

  // Handle file progress
  const handleFileProgress = useCallback((progress: { percentage: number, fileName: string }) => {
    setFileProgress(progress)
    if (progress.percentage >= 100) {
      setTimeout(() => {
        setFileProgress(null)
        setIsSendingFile(false)
      }, 1000)
    }
  }, [])

  // Handle file selection (preview)
  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0)

    // Check total file size (limit to 100MB)
    if (totalSize > 100 * 1024 * 1024) {
      setError('Total file size must be less than 100MB')
      return
    }

    setSelectedFiles(files)
    setError(null)
  }, [])

  // Handle file upload (actual sending)
  const handleFileUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !chatManager) return

    const fileArray = Array.from(selectedFiles)

    try {
      setError(null)
      setIsSendingFile(true)

      let fileToSend: File

      if (fileArray.length === 1) {
        // Single file - send as is
        fileToSend = fileArray[0]
        setFileProgress({ percentage: 0, fileName: fileToSend.name })
      } else {
        // Multiple files - create zip
        const zip = new JSZip()
        const zipFileName = `Files_${new Date().toISOString().slice(0, 10)}.zip`
        
        setFileProgress({ percentage: 0, fileName: `Creating ${zipFileName}...` })

        // Add files to zip
        fileArray.forEach(file => {
          zip.file(file.name, file)
        })

        // Generate zip file
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        })

        fileToSend = new File([zipBlob], zipFileName, { type: 'application/zip' })
        setFileProgress({ percentage: 0, fileName: zipFileName })
      }
      
      await chatManager.sendFile(fileToSend)
      
      // Clear file input and selection
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setSelectedFiles(null)
    } catch (error) {
      console.error('Failed to send file:', error)
      setError('Failed to send file. Please try again.')
      setIsSendingFile(false)
      setFileProgress(null)
    }
  }, [chatManager, selectedFiles])

  // Cancel file selection
  const handleCancelFileSelection = useCallback(() => {
    setSelectedFiles(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Create chat room
  const createRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name')
      return
    }

    try {
      setError(null)
      
      const manager = new ChatWebRTCManager(
        true, // isHost
        undefined, // subscriberName
        handleMessage,
        handleSubscriberJoined,
        handleSubscriberLeft,
        () => console.log('Chat: Host connected'),
        () => console.log('Chat: Host disconnected'),
        handleFileProgress // File progress callback
      )

      const signalData = await manager.createOffer()
      
      setChatManager(manager)
      setOfferData(JSON.stringify(signalData))
      setStep('waiting')
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `Welcome to "${roomName}" chat room! Share the QR code for others to join.`,
        timestamp: Date.now(),
        sender: 'host',
        subscriberId: 'system'
      }
      setMessages([welcomeMessage])
      
    } catch (error) {
      console.error('Failed to create room:', error)
      setError('Failed to create chat room. Please try again.')
    }
  }

  // Handle subscriber answer
  const handleAnswerReceived = useCallback(async (answerText: string) => {
    if (!chatManager) return

    try {
      const answerData: ChatSignalData = JSON.parse(answerText)
      await chatManager.processAnswer(answerData)
      
      // Switch to active state when first subscriber joins
      if (step === 'waiting') {
        setStep('active')
      }
    } catch (error) {
      console.error('Failed to process answer:', error)
      setError('Failed to connect subscriber. Please try again.')
    }
  }, [chatManager, step])

  // Send message
  const sendMessage = () => {
    if (!messageInput.trim() || !chatManager) return

    chatManager.sendMessage(messageInput.trim())
    setMessageInput('')
  }

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

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
            <div className="bg-blue-500 p-2 rounded-full">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-medium text-gray-800">Chat Host</h2>
              <p className="text-sm text-gray-600">
                {step === 'setup' && 'Create a new chat room'}
                {step === 'waiting' && `"${roomName}" - Waiting for subscribers`}
                {step === 'active' && `"${roomName}" - ${subscribers.length} subscriber(s)`}
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

      {/* Step 1: Setup */}
      {step === 'setup' && (
        <div className="card">
          <div className="text-center mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Create Chat Room</h3>
            <p className="text-sm text-gray-600">Enter a name for your chat room</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Room name (e.g., Team Meeting, Study Group)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="input-field"
              maxLength={50}
            />
            
            <button
              onClick={createRoom}
              disabled={!roomName.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Waiting for subscribers */}
      {step === 'waiting' && (
        <div className="space-y-4">
          {/* QR Code for joining */}
          <QRCodeDisplay
            data={offerData}
            title="Room Connection"
            description="Share this QR code or connection data for others to join your chat room"
          />

          {/* Scan subscriber responses */}
          <QRCodeScanner
            onScan={handleAnswerReceived}
            title="Scan Subscriber Response"
            description="Scan QR codes from users who want to join your chat"
          />
        </div>
      )}

      {/* Step 3: Active chat */}
      {step === 'active' && (
        <div className="space-y-4">
          {/* Subscriber list */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-800">
                Active Subscribers ({subscribers.length})
              </h3>
            </div>
            
            {subscribers.length === 0 ? (
              <p className="text-sm text-gray-500">No subscribers connected</p>
            ) : (
              <div className="space-y-2">
                {subscribers.map(subscriber => (
                  <div 
                    key={subscriber.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-800">
                        {subscriber.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(subscriber.joinedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                    No messages yet. Type a message to get started!
                  </p>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id}
                      className={`flex ${message.sender === 'host' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.subscriberId === 'system' 
                          ? 'bg-yellow-100 text-yellow-800 text-center text-sm'
                          : message.sender === 'host' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                        {message.subscriberId !== 'system' && message.sender === 'subscriber' && (
                          <div className="text-xs text-gray-500 mb-1">
                            {subscribers.find(s => s.id === message.subscriberId)?.name || 'Unknown'}
                          </div>
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

              {/* File selection preview */}
              {selectedFiles && !isSendingFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {selectedFiles.length} file(s) selected
                      </span>
                    </div>
                    <button
                      onClick={handleCancelFileSelection}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {Array.from(selectedFiles).map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="truncate text-green-700">{file.name}</span>
                        <span className="text-green-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-green-600 mb-3">
                    Total size: {(Array.from(selectedFiles).reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    {selectedFiles.length > 1 && ' • Will be sent as a zip file'}
                  </div>
                  
                  <button
                    onClick={handleFileUpload}
                    disabled={isSendingFile}
                    className="w-full btn-primary text-sm"
                  >
                    {selectedFiles.length === 1 ? 'Send File' : `Send ${selectedFiles.length} Files as ZIP`}
                  </button>
                </div>
              )}

              {/* File upload progress */}
              {fileProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Sending {fileProgress.fileName}...
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileProgress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {fileProgress.percentage}% complete
                  </div>
                </div>
              )}

              {/* Message input */}
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelection}
                  className="hidden"
                  accept="*/*"
                  multiple
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSendingFile}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  title="Send file(s) - Select multiple files to create a zip"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 input-field"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || isSendingFile}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Allow more subscribers to join */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-3">
              <QrCode className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-800">Add More Subscribers</h3>
            </div>
            
            <div className="space-y-4">
              {/* QR Code for new subscribers */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center mb-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    📱 Share this connection data with new subscribers
                  </h4>
                  <p className="text-xs text-blue-600">
                    New people can copy this data to join the chat
                  </p>
                </div>
                
                <QRCodeDisplay
                  data={offerData}
                  title=""
                  description=""
                />
                
                {/* Copy connection data button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(offerData)
                    setCopyNotification(true)
                    setTimeout(() => setCopyNotification(false), 2000)
                  }}
                  className="w-full mt-3 btn-secondary text-sm flex items-center justify-center space-x-2"
                >
                  {copyNotification ? (
                    <>
                      <span>✅</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy Connection Data</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Manual scanner for responses */}
              <QRCodeScanner
                onScan={handleAnswerReceived}
                title="Connect New Subscriber"
                description="When someone wants to join, they'll give you their response data to paste here"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatHost 