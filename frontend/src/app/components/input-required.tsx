'use client'

import React, { startTransition, useState } from 'react'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/app/actions/provider'

export const InputRequired: React.FC<{
  message: string
}> = ({
  message
}) => {
  const [, setUIState] = useUIState()
  const { search } = useActions<typeof AI>()
  const [input, setInput] = useState('')
  return (
    <div>
      <div>{message}</div>
      <input type="text" value={input}
             onChange={e => setInput(e.target.value)}
             placeholder="input required"
      />
      <button type="submit"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              onClick={() => {
                startTransition(async () => {
                  const response = await search(input)
                  setUIState({ ui: response.display })
                })
              }}
      >

        Search
      </button>
    </div>
  )
}