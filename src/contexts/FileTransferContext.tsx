import React, { createContext, useContext, useState, ReactNode } from 'react'
import { TransferProgress, SignalData } from '../types'

interface FileTransferContextType {
  progress: TransferProgress | null
  setProgress: (progress: TransferProgress | null) => void
  signalData: SignalData | null
  setSignalData: (data: SignalData | null) => void
  receivedFile: File | null
  setReceivedFile: (file: File | null) => void
  isTransferring: boolean
  setIsTransferring: (transferring: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}

const FileTransferContext = createContext<FileTransferContextType | undefined>(undefined)

export const useFileTransfer = () => {
  const context = useContext(FileTransferContext)
  if (!context) {
    throw new Error('useFileTransfer must be used within a FileTransferProvider')
  }
  return context
}

interface FileTransferProviderProps {
  children: ReactNode
}

export const FileTransferProvider: React.FC<FileTransferProviderProps> = ({ children }) => {
  const [progress, setProgress] = useState<TransferProgress | null>(null)
  const [signalData, setSignalData] = useState<SignalData | null>(null)
  const [receivedFile, setReceivedFile] = useState<File | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value: FileTransferContextType = {
    progress,
    setProgress,
    signalData,
    setSignalData,
    receivedFile,
    setReceivedFile,
    isTransferring,
    setIsTransferring,
    error,
    setError
  }

  return (
    <FileTransferContext.Provider value={value}>
      {children}
    </FileTransferContext.Provider>
  )
} 