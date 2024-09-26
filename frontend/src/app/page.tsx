'use client'
import { startTransition } from 'react'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/app/actions/provider'

export default function Home () {
  const [uiState, setUIState] = useUIState()
  const { startSearch } = useActions<typeof AI>()
  return (
    <div className="pb-[200px] pt-4 md:pt-10">
      {uiState.ui ? (
        <div className="mt-4">{uiState.ui}</div>
      ) : (
        <button type="button"
                onClick={() => {
                  startTransition(async () => {
                    const response = await startSearch()
                    setUIState({
                      ui: response.display
                    })
                  })
                }}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Start search
        </button>
      )}
    </div>
  )
}
