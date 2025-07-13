import { useState, useCallback } from 'react'
import { FileTransferProvider } from './contexts/FileTransferContext'
import Sender from './components/Sender'
import Receiver from './components/Receiver'
import ChatApp from './components/ChatApp'
import './index.css'

type Role = 'sender' | 'receiver'
type AppMode = 'file-transfer' | 'chat-broadcaster'

const RoleSelection = ({ onRoleSelect }: { onRoleSelect: (role: Role) => void }) => (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Choose Your Role
      </h2>
      <p className="text-sm text-gray-600">
        Select whether you want to send or receive files
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onRoleSelect('sender')}
        className="card hover:bg-blue-50 hover:border-blue-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-blue-500 p-3 rounded-full">
            <span className="text-white text-2xl">📤</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Sender</h3>
            <p className="text-sm text-gray-600">Send files to others</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onRoleSelect('receiver')}
        className="card hover:bg-green-50 hover:border-green-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-green-500 p-3 rounded-full">
            <span className="text-white text-2xl">📥</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Receiver</h3>
            <p className="text-sm text-gray-600">Receive files from others</p>
          </div>
        </div>
      </button>
    </div>
  </div>
)

const AppModeSelection = ({ onModeSelect }: { onModeSelect: (mode: AppMode) => void }) => (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Choose App Mode
      </h2>
      <p className="text-sm text-gray-600">
        Select what you want to do
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4">
      <button
        onClick={() => onModeSelect('file-transfer')}
        className="card hover:bg-blue-50 hover:border-blue-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-blue-500 p-3 rounded-full">
            <span className="text-white text-2xl">📁</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">File Transfer</h3>
            <p className="text-sm text-gray-600">Send and receive files securely</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onModeSelect('chat-broadcaster')}
        className="card hover:bg-green-50 hover:border-green-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-green-500 p-3 rounded-full">
            <span className="text-white text-2xl">💬</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Chat Broadcaster</h3>
            <p className="text-sm text-gray-600">Broadcast messages to multiple subscribers</p>
          </div>
        </div>
      </button>
    </div>
  </div>
)

function MainApp() {
  const [mode, setMode] = useState<AppMode | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode)
    setRole(null)
    setIsConnected(false)
  }, [])

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole)
    setIsConnected(false)
  }, [])

  const handleReset = useCallback(() => {
    setMode(null)
    setRole(null)
    setIsConnected(false)
  }, [])

  const handleBackToModeSelection = useCallback(() => {
    setMode(null)
    setRole(null)
    setIsConnected(false)
  }, [])

  // If Chat Broadcaster is selected, render ChatApp
  if (mode === 'chat-broadcaster') {
    return <ChatApp onBack={handleBackToModeSelection} />
  }

  return (
    <FileTransferProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-500 p-3 rounded-full">
                <span className="text-white text-2xl">
                  {mode === 'file-transfer' ? '📶' : '🔧'}
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {mode === 'file-transfer' ? 'Offline File Transfer' : 'Local Network Tools'}
            </h1>
            <p className="text-gray-600 text-sm">
              {mode === 'file-transfer' 
                ? 'Secure file sharing over local Wi-Fi' 
                : 'Choose your preferred tool'
              }
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {!mode ? (
              <AppModeSelection onModeSelect={handleModeChange} />
            ) : mode === 'file-transfer' && !role ? (
              <div className="space-y-4">
                <RoleSelection onRoleSelect={handleRoleChange} />
                <div className="card">
                  <button
                    onClick={handleReset}
                    className="w-full text-sm text-blue-500 hover:text-blue-600"
                  >
                    ← Back to Mode Selection
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Connection Status */}
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {isConnected ? '🟢 Connected via WiFi' : '🔴 Not Connected'}
                      </span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      Change Mode
                    </button>
                  </div>
                </div>

                {/* File Transfer Interface */}
                {role === 'sender' ? (
                  <Sender onConnectionChange={setIsConnected} />
                ) : (
                  <Receiver onConnectionChange={setIsConnected} />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>🔒 No internet required • Works on local Wi-Fi</p>
          </div>
        </div>
      </div>
    </FileTransferProvider>
  )
}

export default MainApp 