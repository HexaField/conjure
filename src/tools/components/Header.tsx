import React from 'react'

export function Header() {
  return (
    <div className="py-8 text-center">
      <h1 className="mb-2 text-4xl font-bold text-gray-800">JSON Data Transformer</h1>
      <p className="text-gray-600">Transform data from one shape to another using an LLM generated function</p>
    </div>
  )
}
