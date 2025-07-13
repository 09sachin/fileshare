import Peer from 'simple-peer'
import { FileData, TransferProgress, SignalData } from '../types'

export const CHUNK_SIZE = 16384 // 16KB chunks
export const CONNECTION_TIMEOUT = 30000 // 30 seconds
export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302'
]

export class WebRTCManager {
  private peer: Peer.Instance | null = null
  private isInitiator: boolean = false
  private fileData: FileData | null = null
  private receivedChunks: Map<number, ArrayBuffer> = new Map()
  private expectedChunkIndex = 0
  private connectionTimeout: NodeJS.Timeout | null = null
  private onProgressCallback?: (progress: TransferProgress) => void
  private onFileReceivedCallback?: (file: File) => void
  private onConnectedCallback?: () => void
  private onDisconnectedCallback?: () => void

  constructor(
    isInitiator: boolean,
    onProgress?: (progress: TransferProgress) => void,
    onFileReceived?: (file: File) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) {
    this.isInitiator = isInitiator
    this.onProgressCallback = onProgress
    this.onFileReceivedCallback = onFileReceived
    this.onConnectedCallback = onConnected
    this.onDisconnectedCallback = onDisconnected
  }

  createPeer(): Promise<SignalData> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`WebRTC: Creating peer (initiator: ${this.isInitiator})`)
        
        this.peer = new Peer({
          initiator: this.isInitiator,
          trickle: false,
          config: {
            iceServers: STUN_SERVERS.map(url => ({ urls: url }))
          }
        })

        // Set up connection timeout
        this.connectionTimeout = setTimeout(() => {
          console.error('WebRTC: Connection timeout')
          this.cleanup()
          reject(new Error('Connection timeout'))
        }, CONNECTION_TIMEOUT)

        this.peer.on('signal', (data) => {
          console.log('WebRTC: Signal generated', data.type)
          const signalData: SignalData = {
            type: this.isInitiator ? 'offer' : 'answer',
            signal: data,
            metadata: this.fileData || undefined
          }
          resolve(signalData)
        })

        this.peer.on('connect', () => {
          console.log('WebRTC: Connection established successfully')
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          this.onConnectedCallback?.()
        })

        this.peer.on('data', (data) => {
          this.handleReceivedData(data)
        })

        this.peer.on('error', (err) => {
          console.error('WebRTC: Peer error:', err)
          this.cleanup()
          reject(err)
        })

        this.peer.on('close', () => {
          console.log('WebRTC: Connection closed')
          this.cleanup()
          this.onDisconnectedCallback?.()
        })

      } catch (error) {
        console.error('WebRTC: Failed to create peer:', error)
        this.cleanup()
        reject(error)
      }
    })
  }

  connectToPeer(signalData: SignalData): void {
    if (!this.peer) {
      throw new Error('Peer not initialized')
    }
    
    console.log('WebRTC: Connecting to peer with signal type:', signalData.type)
    
    if (signalData.metadata) {
      console.log('WebRTC: Setting file metadata:', signalData.metadata)
      this.fileData = signalData.metadata
    }
    
    try {
      this.peer.signal(signalData.signal)
    } catch (error) {
      console.error('WebRTC: Failed to signal peer:', error)
      this.cleanup()
      throw error
    }
  }

  async sendFile(file: File): Promise<void> {
    if (!this.peer || !this.peer.connected) {
      throw new Error('Peer not connected')
    }

    console.log('WebRTC: Starting file transfer:', file.name, file.size, 'bytes')
    
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    
    this.fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      chunks
    }

    try {
      // Send file metadata first
      this.peer.send(JSON.stringify({
        type: 'fileStart',
        data: this.fileData
      }))

      // Send file chunks with proper sequencing
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        
        const arrayBuffer = await chunk.arrayBuffer()
        
        // Send chunk metadata
        this.peer.send(JSON.stringify({
          type: 'chunkStart',
          data: {
            index: i,
            size: arrayBuffer.byteLength,
            total: chunks
          }
        }))
        
        // Send the actual chunk data
        this.peer.send(arrayBuffer)

        // Update progress
        const progress = {
          sent: i + 1,
          total: chunks,
          percentage: Math.round(((i + 1) / chunks) * 100),
          speed: 0 // Calculate speed separately if needed
        }
        
        this.onProgressCallback?.(progress)

        // Small delay to prevent overwhelming the connection
        await new Promise<void>((resolve) => setTimeout(resolve, 10))
      }

      // Send completion signal
      this.peer.send(JSON.stringify({
        type: 'fileComplete'
      }))
      
      console.log('WebRTC: File transfer completed successfully')
    } catch (error) {
      console.error('WebRTC: File transfer failed:', error)
      throw error
    }
  }

  private handleReceivedData(data: any): void {
    try {
      // Try to parse as JSON first (metadata/control messages)
      const message = JSON.parse(data.toString())
      
      switch (message.type) {
        case 'fileStart':
          console.log('WebRTC: Receiving file metadata:', message.data)
          this.fileData = message.data
          this.receivedChunks.clear()
          this.expectedChunkIndex = 0
          break
          
        case 'chunkStart':
          console.log('WebRTC: Receiving chunk metadata:', message.data)
          // Next data will be the actual chunk data
          break
          
        case 'fileComplete':
          console.log('WebRTC: File transfer complete, assembling...')
          this.assembleFile()
          break
          
        default:
          console.warn('WebRTC: Unknown message type:', message.type)
      }
    } catch (error) {
      // If JSON parsing fails, it's likely binary chunk data
      if (this.fileData) {
        this.handleBinaryChunk(data)
      } else {
        console.warn('WebRTC: Received binary data without file metadata')
      }
    }
  }

  private handleBinaryChunk(data: ArrayBuffer): void {
    if (!this.fileData) {
      console.error('WebRTC: Cannot handle chunk: no file metadata')
      return
    }

    const chunkIndex = this.expectedChunkIndex
    this.receivedChunks.set(chunkIndex, data)
    this.expectedChunkIndex++

    console.log(`WebRTC: Received chunk ${chunkIndex + 1}/${this.fileData.chunks}`)

    // Update progress
    const progress = {
      sent: this.receivedChunks.size,
      total: this.fileData.chunks,
      percentage: Math.round((this.receivedChunks.size / this.fileData.chunks) * 100),
      speed: 0
    }
    
    this.onProgressCallback?.(progress)
  }

  private assembleFile(): void {
    if (!this.fileData) {
      console.error('WebRTC: Cannot assemble file: no metadata')
      return
    }
    
    if (this.receivedChunks.size !== this.fileData.chunks) {
      console.error(`WebRTC: Cannot assemble file: expected ${this.fileData.chunks} chunks, got ${this.receivedChunks.size}`)
      return
    }

    console.log('WebRTC: Assembling file from chunks...')
    
    const chunks: ArrayBuffer[] = []
    for (let i = 0; i < this.fileData.chunks; i++) {
      const chunk = this.receivedChunks.get(i)
      if (!chunk) {
        console.error(`WebRTC: Missing chunk ${i}`)
        return
      }
      chunks.push(chunk)
    }

    try {
      const fileBlob = new Blob(chunks, { type: this.fileData.type })
      const file = new File([fileBlob], this.fileData.name, {
        type: this.fileData.type,
        lastModified: Date.now()
      })

      console.log('WebRTC: File assembled successfully:', file.name, file.size, 'bytes')
      this.onFileReceivedCallback?.(file)
    } catch (error) {
      console.error('WebRTC: Error assembling file:', error)
    }
  }

  private cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
  }

  destroy(): void {
    console.log('WebRTC: Destroying peer connection')
    this.cleanup()
    
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
    
    this.receivedChunks.clear()
    this.fileData = null
    this.expectedChunkIndex = 0
  }

  get isConnected(): boolean {
    return this.peer?.connected || false
  }
} 