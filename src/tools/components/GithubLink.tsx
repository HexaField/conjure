import { GithubOriginalFalse } from '@ir-engine/ui/src/icons'
import React from 'react'

const GithubLink = () => {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 rounded-lg bg-black px-4 py-2 text-white">
      <a
        href="https://github.com/hexafield/conjure"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center"
      >
        <GithubOriginalFalse className="mr-2 inline-block" />
      </a>
    </div>
  )
}

export default GithubLink
