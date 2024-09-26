import { createAI } from 'ai/rsc'
import { search, startSearch } from '@/app/actions/index'

export const AI = createAI({
  actions: {
    startSearch,
    search
  },
  initialUIState: {},
  initialAIState: {}
})
