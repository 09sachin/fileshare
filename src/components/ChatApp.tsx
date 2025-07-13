import React, { useState, useCallback } from 'react'
import { MessageCircle, Users, User } from 'lucide-react'
import { ChatRole } from '../types'
import ChatHost from './ChatHost'
import ChatSubscriber from './ChatSubscriber'

interface ChatAppProps {
  onBack: () => void
}

const ChatRoleSelection = ({ onRoleSelect }: { onRoleSelect: (role: ChatRole) => void }) => (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Chat Broadcaster
      </h2>
      <p className="text-sm text-gray-600">
        Choose your role to start broadcasting or join a chat room
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4">
      <button
        onClick={() => onRoleSelect('host')}
        className="card hover:bg-blue-50 hover:border-blue-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-blue-500 p-3 rounded-full">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Host</h3>
            <p className="text-sm text-gray-600">
              Create a chat room and broadcast messages to subscribers
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onRoleSelect('subscriber')}
        className="card hover:bg-green-50 hover:border-green-300 transition-colors p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-green-500 p-3 rounded-full">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Subscriber</h3>
            <p className="text-sm text-gray-600">
              Join an existing chat room to receive messages
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
)

const ChatApp: React.FC<ChatAppProps> = ({ onBack }) => {
  const [role, setRole] = useState<ChatRole | null>(null)

  const handleRoleChange = useCallback((newRole: ChatRole) => {
    setRole(newRole)
  }, [])

  const handleRoleBack = useCallback(() => {
    setRole(null)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-500 p-3 rounded-full">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Chat Broadcaster
          </h1>
          <p className="text-gray-600 text-sm">
            Real-time chat broadcasting over local network
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {!role ? (
            <div className="space-y-4">
              <ChatRoleSelection onRoleSelect={handleRoleChange} />
              
              <div className="card">
                <button
                  onClick={onBack}
                  className="w-full text-sm text-blue-500 hover:text-blue-600"
                >
                  ← Back to File Transfer
                </button>
              </div>
            </div>
          ) : (
            <>
              {role === 'host' ? (
                <ChatHost onBack={handleRoleBack} />
              ) : (
                <ChatSubscriber onBack={handleRoleBack} />
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
  )
}

export default ChatApp 