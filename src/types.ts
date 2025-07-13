export type Role = 'sender' | 'receiver'
export type ChatRole = 'host' | 'subscriber'

export interface TransferProgress {
  sent: number
  total: number
  percentage: number
  speed: number
}

export interface FileData {
  name: string
  size: number
  type: string
  chunks: number
}

export interface FileChunk {
  id: string
  index: number
  data: ArrayBuffer
  total: number
}

export interface SignalData {
  type: 'offer' | 'answer'
  signal: any
  metadata?: FileData
}

export interface PeerConnection {
  id: string
  connected: boolean
  peer: any
}

export interface ChatMessage {
  id: string
  content: string
  timestamp: number
  sender: 'host' | 'subscriber'
  subscriberId?: string
  type?: 'text' | 'file'
  fileData?: {
    name: string
    size: number
    type: string
    url?: string // For downloaded files
  }
}

export interface Subscriber {
  id: string
  name: string
  connected: boolean
  joinedAt: number
}

export interface ChatSignalData {
  type: 'offer' | 'answer'
  signal: any
  subscriberId?: string
  subscriberName?: string
} 