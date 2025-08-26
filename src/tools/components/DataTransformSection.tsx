import React from 'react'
import { JsonDisplay } from './JsonDisplay'

interface DataTransformSectionProps {
  transformer: string | object | null
  outputData: object | null
  onTransform: () => void
  onOutputDataChange: (newData: object) => void
}

export function DataTransformSection({
  transformer,
  outputData,
  onTransform,
  onOutputDataChange
}: DataTransformSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4">
        <label htmlFor="targetSchema" className="mb-2 block text-sm font-medium text-gray-700">
          Transform Data
        </label>
      </div>
      {/* Button */}
      <div className="mt-4">
        <button
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          disabled={!transformer}
          onClick={onTransform}
        >
          Transform Data
        </button>
      </div>
      {outputData && (
        <JsonDisplay
          title="Output Data"
          data={outputData}
          copyButtonText="Copy Output"
          editable={true}
          onDataChange={onOutputDataChange}
        />
      )}
    </div>
  )
}
