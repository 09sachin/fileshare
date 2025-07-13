import Peer from 'simple-peer'
import { ChatMessage, Subscriber, ChatSignalData } from '../types'

export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302'
]

export const CHUNK_SIZE = 16384 // 16KB chunks

export class ChatWebRTCManager {
  private isHost: boolean = false
  private peers: Map<string, Peer.Instance> = new Map()
  private subscribers: Map<string, Subscriber> = new Map()
  private hostPeer: Peer.Instance | null = null
  private subscriberId: string = ''
  private subscriberName: string = ''
  private onMessageCallback?: (message: ChatMessage) => void
  private onSubscriberJoinedCallback?: (subscriber: Subscriber) => void
  private onSubscriberLeftCallback?: (subscriberId: string) => void
  private onConnectedCallback?: () => void
  private onDisconnectedCallback?: () => void
  private onFileProgressCallback?: (progress: { percentage: number, fileName: string }) => void
  
  // File transfer state
  private fileTransfers: Map<string, {
    chunks: Map<number, ArrayBuffer>,
    receivedChunks: number,
    totalChunks: number,
    fileName: string,
    fileSize: number,
    fileType: string
  }> = new Map()

  constructor(
    isHost: boolean,
    subscriberName?: string,
    onMessage?: (message: ChatMessage) => void,
    onSubscriberJoined?: (subscriber: Subscriber) => void,
    onSubscriberLeft?: (subscriberId: string) => void,
    onConnected?: () => void,
    onDisconnected?: () => void,
    onFileProgress?: (progress: { percentage: number, fileName: string }) => void
  ) {
    this.isHost = isHost
    this.subscriberName = subscriberName || ''
    this.subscriberId = '' // Will be set from offer data for subscribers
    this.onMessageCallback = onMessage
    this.onSubscriberJoinedCallback = onSubscriberJoined
    this.onSubscriberLeftCallback = onSubscriberLeft
    this.onConnectedCallback = onConnected
    this.onDisconnectedCallback = onDisconnected
    this.onFileProgressCallback = onFileProgress
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Host creates offer for new subscriber
  async createOffer(): Promise<ChatSignalData> {
    if (!this.isHost) {
      throw new Error('Only host can create offers')
    }

    return new Promise((resolve) => {
      const subscriberId = this.generateId()
      console.log(`Chat: Host creating offer for subscriber ${subscriberId}`)
      
      const peer = new Peer({
        initiator: true,
        trickle: false,
        config: {
          iceServers: STUN_SERVERS.map(url => ({ urls: url }))
        }
      })

      peer.on('signal', (data) => {
        console.log('Chat: Host offer signal generated')
        const signalData: ChatSignalData = {
          type: 'offer',
          signal: data,
          subscriberId
        }
        resolve(signalData)
      })

      peer.on('connect', () => {
        console.log(`Chat: Host connected to subscriber ${subscriberId}`)
        this.onConnectedCallback?.()
      })

      peer.on('data', (data) => {
        this.handleReceivedData(data, subscriberId)
      })

      peer.on('error', (err) => {
        console.error(`Chat: Host peer error for subscriber ${subscriberId}:`, err)
        this.removeSubscriber(subscriberId)
      })

      peer.on('close', () => {
        console.log(`Chat: Host connection closed for subscriber ${subscriberId}`)
        this.removeSubscriber(subscriberId)
      })

      // Store the peer with a temporary ID
      this.peers.set(subscriberId, peer)
    })
  }

  // Subscriber creates answer to host's offer
  async createAnswer(offerData: ChatSignalData): Promise<ChatSignalData> {
    if (this.isHost) {
      throw new Error('Host cannot create answers')
    }

    return new Promise((resolve, reject) => {
      console.log('Chat: Subscriber creating answer to host offer')
      
      // Use the subscriber ID from the offer, not generate our own
      const subscriberId = offerData.subscriberId
      if (!subscriberId) {
        reject(new Error('Invalid offer data: missing subscriberId'))
        return
      }
      
      // Store the subscriber ID from the offer for later use
      this.subscriberId = subscriberId
      
      const peer = new Peer({
        initiator: false,
        trickle: false,
        config: {
          iceServers: STUN_SERVERS.map(url => ({ urls: url }))
        }
      })

      peer.on('signal', (data) => {
        console.log('Chat: Subscriber answer signal generated')
        const signalData: ChatSignalData = {
          type: 'answer',
          signal: data,
          subscriberId: subscriberId, // Use the ID from the offer
          subscriberName: this.subscriberName
        }
        resolve(signalData)
      })

      peer.on('connect', () => {
        console.log('Chat: Subscriber connected to host')
        this.onConnectedCallback?.()
      })

      peer.on('data', (data) => {
        this.handleReceivedData(data, 'host')
      })

      peer.on('error', (err) => {
        console.error('Chat: Subscriber peer error:', err)
        this.onDisconnectedCallback?.()
      })

      peer.on('close', () => {
        console.log('Chat: Subscriber connection closed')
        this.onDisconnectedCallback?.()
      })

      // Connect to host's offer
      peer.signal(offerData.signal)
      this.hostPeer = peer
    })
  }

  // Host processes subscriber's answer
  async processAnswer(answerData: ChatSignalData): Promise<void> {
    if (!this.isHost) {
      throw new Error('Only host can process answers')
    }

    const subscriberId = answerData.subscriberId
    const subscriberName = answerData.subscriberName
    
    if (!subscriberId || !subscriberName) {
      throw new Error('Invalid answer data')
    }

    console.log(`Chat: Host processing answer from subscriber ${subscriberId} (${subscriberName})`)
    
    const peer = this.peers.get(subscriberId)
    if (!peer) {
      throw new Error('Peer not found for subscriber')
    }

    // Signal the answer to complete the connection
    peer.signal(answerData.signal)

    // Add subscriber to our list
    const subscriber: Subscriber = {
      id: subscriberId,
      name: subscriberName,
      connected: true,
      joinedAt: Date.now()
    }

    this.subscribers.set(subscriberId, subscriber)
    this.onSubscriberJoinedCallback?.(subscriber)

    // Send welcome message to the new subscriber
    this.sendMessage('Welcome to the chat!', [subscriberId])
  }

  // Send message (host to all subscribers, or subscriber to host)
  sendMessage(content: string, targetSubscribers?: string[]): void {
    const message: ChatMessage = {
      id: this.generateId(),
      content,
      timestamp: Date.now(),
      sender: this.isHost ? 'host' : 'subscriber',
      subscriberId: this.isHost ? undefined : this.subscriberId,
      type: 'text'
    }

    if (this.isHost) {
      // Host sends to all subscribers or specific ones
      const targets = targetSubscribers || Array.from(this.subscribers.keys())
      
      targets.forEach(subscriberId => {
        const peer = this.peers.get(subscriberId)
        if (peer && peer.connected) {
          try {
            peer.send(JSON.stringify({
              type: 'message',
              data: message
            }))
            console.log(`Chat: Host sent message to subscriber ${subscriberId}`)
          } catch (error) {
            console.error(`Chat: Failed to send message to subscriber ${subscriberId}:`, error)
          }
        }
      })
    } else {
      // Subscriber sends to host
      if (this.hostPeer && this.hostPeer.connected) {
        try {
          this.hostPeer.send(JSON.stringify({
            type: 'message',
            data: message
          }))
          console.log('Chat: Subscriber sent message to host')
        } catch (error) {
          console.error('Chat: Failed to send message to host:', error)
        }
      }
    }

    // Trigger callback for local message display
    this.onMessageCallback?.(message)
  }

  // Send file (host only)
  async sendFile(file: File, targetSubscribers?: string[]): Promise<void> {
    if (!this.isHost) {
      throw new Error('Only host can send files')
    }

    const fileId = this.generateId()
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    const targets = targetSubscribers || Array.from(this.subscribers.keys())

    console.log(`Chat: Host sending file ${file.name} (${file.size} bytes) to ${targets.length} subscribers`)

    // Send file message to local display
    const fileMessage: ChatMessage = {
      id: fileId,
      content: `📁 ${file.name}`,
      timestamp: Date.now(),
      sender: 'host',
      type: 'file',
      fileData: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    }
    this.onMessageCallback?.(fileMessage)

    // Send file metadata to all target subscribers
    targets.forEach(subscriberId => {
      const peer = this.peers.get(subscriberId)
      if (peer && peer.connected) {
        try {
          peer.send(JSON.stringify({
            type: 'fileStart',
            data: {
              fileId,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              totalChunks: chunks
            }
          }))
        } catch (error) {
          console.error(`Chat: Failed to send file metadata to subscriber ${subscriberId}:`, error)
        }
      }
    })

    // Send file chunks
    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const arrayBuffer = await chunk.arrayBuffer()

      targets.forEach(subscriberId => {
        const peer = this.peers.get(subscriberId)
        if (peer && peer.connected) {
          try {
            // Send chunk metadata
            peer.send(JSON.stringify({
              type: 'fileChunk',
              data: {
                fileId,
                chunkIndex: i,
                totalChunks: chunks
              }
            }))
            
            // Send chunk data
            peer.send(arrayBuffer)
          } catch (error) {
            console.error(`Chat: Failed to send file chunk ${i} to subscriber ${subscriberId}:`, error)
          }
        }
      })

      // Update progress
      const percentage = Math.round(((i + 1) / chunks) * 100)
      this.onFileProgressCallback?.({ percentage, fileName: file.name })

      // Small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Send file completion signal
    targets.forEach(subscriberId => {
      const peer = this.peers.get(subscriberId)
      if (peer && peer.connected) {
        try {
          peer.send(JSON.stringify({
            type: 'fileComplete',
            data: { fileId }
          }))
        } catch (error) {
          console.error(`Chat: Failed to send file completion to subscriber ${subscriberId}:`, error)
        }
      }
    })

    console.log(`Chat: File ${file.name} sent successfully`)
  }

  // Handle received data
  private handleReceivedData(data: any, senderId: string): void {
    try {
      const parsed = JSON.parse(data.toString())
      
      switch (parsed.type) {
        case 'message':
          console.log(`Chat: Received message from ${senderId}`)
          this.onMessageCallback?.(parsed.data)
          break
          
        case 'fileStart':
          console.log(`Chat: Receiving file metadata from ${senderId}:`, parsed.data)
          this.handleFileStart(parsed.data, senderId)
          break
          
        case 'fileChunk':
          console.log(`Chat: Receiving file chunk metadata from ${senderId}:`, parsed.data)
          this.handleFileChunkMeta(parsed.data, senderId)
          break
          
        case 'fileComplete':
          console.log(`Chat: File transfer complete from ${senderId}:`, parsed.data)
          this.handleFileComplete(parsed.data, senderId)
          break
          
        default:
          console.warn('Chat: Unknown message type:', parsed.type)
      }
    } catch (error) {
      // If JSON parsing fails, it's likely binary chunk data
      this.handleBinaryChunk(data, senderId)
    }
  }

  // Handle file transfer start
  private handleFileStart(fileData: any, _senderId: string): void {
    const { fileId, fileName, fileSize, fileType, totalChunks } = fileData
    
    this.fileTransfers.set(fileId, {
      chunks: new Map(),
      receivedChunks: 0,
      totalChunks,
      fileName,
      fileSize,
      fileType
    })

    // Display file message
    const fileMessage: ChatMessage = {
      id: fileId,
      content: `📁 Receiving ${fileName}...`,
      timestamp: Date.now(),
      sender: 'host',
      type: 'file',
      fileData: {
        name: fileName,
        size: fileSize,
        type: fileType
      }
    }
    this.onMessageCallback?.(fileMessage)
  }

  // Handle file chunk metadata (next data will be binary)
  private handleFileChunkMeta(_chunkData: any, _senderId: string): void {
    // This just prepares us for the next binary data
    // The actual chunk handling is done in handleBinaryChunk
  }

  // Handle binary chunk data
  private handleBinaryChunk(data: ArrayBuffer, _senderId: string): void {
    // Find the active file transfer for this sender
    for (const [_fileId, transfer] of this.fileTransfers.entries()) {
      if (transfer.receivedChunks < transfer.totalChunks) {
        const chunkIndex = transfer.receivedChunks
        transfer.chunks.set(chunkIndex, data)
        transfer.receivedChunks++

        console.log(`Chat: Received chunk ${chunkIndex + 1}/${transfer.totalChunks} for ${transfer.fileName}`)

        // Update progress
        const percentage = Math.round((transfer.receivedChunks / transfer.totalChunks) * 100)
        this.onFileProgressCallback?.({ percentage, fileName: transfer.fileName })

        break
      }
    }
  }

  // Handle file transfer completion
  private handleFileComplete(fileData: any, _senderId: string): void {
    const { fileId } = fileData
    const transfer = this.fileTransfers.get(fileId)
    
    if (!transfer) {
      console.error(`Chat: File transfer not found for ${fileId}`)
      return
    }

    if (transfer.receivedChunks !== transfer.totalChunks) {
      console.error(`Chat: Incomplete file transfer: ${transfer.receivedChunks}/${transfer.totalChunks} chunks`)
      return
    }

    // Assemble the file
    const chunks: ArrayBuffer[] = []
    for (let i = 0; i < transfer.totalChunks; i++) {
      const chunk = transfer.chunks.get(i)
      if (!chunk) {
        console.error(`Chat: Missing chunk ${i} for ${transfer.fileName}`)
        return
      }
      chunks.push(chunk)
    }

    try {
      const fileBlob = new Blob(chunks, { type: transfer.fileType })
      const fileUrl = URL.createObjectURL(fileBlob)

      // Update the file message with download link
      const fileMessage: ChatMessage = {
        id: fileId,
        content: `📁 ${transfer.fileName}`,
        timestamp: Date.now(),
        sender: 'host',
        type: 'file',
        fileData: {
          name: transfer.fileName,
          size: transfer.fileSize,
          type: transfer.fileType,
          url: fileUrl
        }
      }
      this.onMessageCallback?.(fileMessage)

      // Clean up
      this.fileTransfers.delete(fileId)
      
      console.log(`Chat: File ${transfer.fileName} assembled successfully`)
    } catch (error) {
      console.error(`Chat: Failed to assemble file ${transfer.fileName}:`, error)
    }
  }

  // Remove subscriber
  private removeSubscriber(subscriberId: string): void {
    if (this.subscribers.has(subscriberId)) {
      this.subscribers.delete(subscriberId)
      this.onSubscriberLeftCallback?.(subscriberId)
    }
    
    const peer = this.peers.get(subscriberId)
    if (peer) {
      peer.destroy()
      this.peers.delete(subscriberId)
    }
  }

  // Get all subscribers
  getSubscribers(): Subscriber[] {
    return Array.from(this.subscribers.values())
  }

  // Get subscriber count
  getSubscriberCount(): number {
    return this.subscribers.size
  }

  // Check if connected
  get isConnected(): boolean {
    if (this.isHost) {
      return this.peers.size > 0
    } else {
      return this.hostPeer?.connected || false
    }
  }

  // Destroy all connections
  destroy(): void {
    console.log('Chat: Destroying all connections')
    
    // Close all peer connections
    this.peers.forEach(peer => peer.destroy())
    this.peers.clear()
    
    if (this.hostPeer) {
      this.hostPeer.destroy()
      this.hostPeer = null
    }
    
    this.subscribers.clear()
  }
} 