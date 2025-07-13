import React, { useState } from 'react'
import { Copy, CheckCircle, Share } from 'lucide-react'
import QRCode from 'qrcode.react'

interface QRCodeDisplayProps {
  data: string
  title: string
  description: string
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ data, title, description }) => {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className="card">
      {title && (
        <div className="text-center mb-4">
          <h3 className="font-medium text-gray-800 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      )}

      {/* Primary: Copy text area */}
      <div className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Share className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Connection Data (recommended)
            </span>
          </div>
          <textarea
            value={data}
            readOnly
            className="w-full h-24 px-2 py-2 text-xs font-mono bg-white border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Connection data will appear here..."
          />
          <button
            onClick={handleCopy}
            className="w-full mt-2 btn-primary text-sm flex items-center justify-center space-x-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy to Share</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary: QR Code (collapsible) */}
        <div className="border-t pt-3">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full text-sm text-gray-600 hover:text-gray-700 flex items-center justify-center space-x-1"
          >
            <span>{showQR ? '▼' : '▶'}</span>
            <span>QR Code (optional)</span>
          </button>
          
          {showQR && (
            <div className="mt-3 text-center">
              <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                <QRCode
                  value={data}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Camera scanning may not work on all devices
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QRCodeDisplay 