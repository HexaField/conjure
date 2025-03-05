import { useHookstate } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'

export const JSONPreview = (props: { json: any }) => {
  const showCurrentInputSchema = useHookstate(false)

  return (
    <div className="mt-4 rounded bg-gray-100 p-2">
      <Button
        className="mb-1 p-4"
        variant="tertiary"
        style={{ top: '10px', left: showCurrentInputSchema.value ? '310px' : '10px' }}
        onClick={() => showCurrentInputSchema.set(!showCurrentInputSchema.value)}
      >
        <h4 className="font-medium">{showCurrentInputSchema.value ? 'Hide' : 'Show'} Input Schema</h4>
        {showCurrentInputSchema.value ? (
          <HiChevronUp className="text-theme-primary pointer-events-none place-self-center" />
        ) : (
          <HiChevronDown className="text-theme-primary pointer-events-none place-self-center" />
        )}
      </Button>
      {showCurrentInputSchema.value && <pre className="text-sm">{JSON.stringify(props.json, null, 2)}</pre>}
    </div>
  )
}
