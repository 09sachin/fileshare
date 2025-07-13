import React from 'react'
import { Send, Download } from 'lucide-react'
import { Role } from '../types'

interface RoleSelectionProps {
  onRoleSelect: (role: Role) => void
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Choose your role
        </h2>
        <p className="text-sm text-gray-600">
          Select whether you want to send or receive a file
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onRoleSelect('sender')}
          className="card hover:bg-blue-50 hover:border-blue-300 transition-colors p-8 text-center"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-blue-500 p-3 rounded-full">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Sender</h3>
              <p className="text-sm text-gray-600">Send a file</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onRoleSelect('receiver')}
          className="card hover:bg-green-50 hover:border-green-300 transition-colors p-8 text-center"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-green-500 p-3 rounded-full">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Receiver</h3>
              <p className="text-sm text-gray-600">Receive a file</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default RoleSelection 