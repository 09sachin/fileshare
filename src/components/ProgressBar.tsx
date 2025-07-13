import React from 'react'

interface ProgressBarProps {
  progress: number
  label?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>{label || 'Progress'}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar 