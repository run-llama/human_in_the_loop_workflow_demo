'use server'
import { createStreamableUI, getMutableAIState } from 'ai/rsc'
import { createStreamableValue } from 'ai/rsc'
import {
  Workflow,
  WorkflowEvent,
  StartEvent,
  StopEvent
} from '@llamaindex/core/workflow'
import { spinner } from '@/app/components/spinner'
import { ReactNode } from 'react'
import { Retry } from '@/app/components/retry'
import { InputRequired } from '@/app/components/input-required'
import { Report } from '@/app/components/report'
import faker from '@fakerjs/faker'

type UIProps = {
  input: string
}

class AIWorkflow extends Workflow {
  constructor (
    public readonly name: string
  ) {
    super()
  }
}

abstract class AIEvent extends WorkflowEvent {
  abstract readonly type: string
  // if the event requires user interaction, will set the AI state and wait for the next step
  readonly userInteraction: boolean

  constructor (
    input: string,
    userInteraction: boolean = false
  ) {
    super(
      input
    )
    this.userInteraction = userInteraction
  }

  abstract UI (props: UIProps): ReactNode
}

class RetryEvent extends AIEvent {
  type = 'retry'

  UI (props: UIProps) {
    return (<Retry placeholder={props.input}/>)
  }
}

class ReportEvent extends AIEvent {
  type = 'report'

  UI (props: UIProps) {
    const streamableValue = createStreamableValue<string>('')
    const interval = setInterval(() => {
      streamableValue.append(faker().word() + ' ')
    }, 100)
    setTimeout(() => {
      clearInterval(interval)
      streamableValue.done()
    }, 1000)

    return (
      <Report
        input={props.input}
        output={streamableValue.value}
      />
    )
  }
}

class ProgressEvent extends AIEvent {
  type = 'progress'

  UI (props: UIProps) {
    return (
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          processing... {props.input}
        </p>
      </div>
    )
  }
}

class InputRequiredEvent extends AIEvent {
  type = 'input-required'

  UI (props: UIProps) {
    return (
      <InputRequired message={props.input}/>
    )
  }
}

class ResultEvent extends AIEvent {
  type = 'result'

  UI (props: UIProps) {
    return (
      <div>
        <p>Search Result: {props.input}</p>
      </div>
    )
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const inputWorkflow = new AIWorkflow('input-workflow')

inputWorkflow.addStep(StartEvent, async (context) => {
  context.writeEventToStream(new ProgressEvent(
    `setting up context...`)
  )
  await sleep(1000)
  context.writeEventToStream(
    new InputRequiredEvent('Please provide me with some input', true))
})

inputWorkflow.addStep(InputRequiredEvent, async (context) => {
  context.writeEventToStream(new StopEvent({
    result: null
  }))
})

const searchWorkflow = new AIWorkflow('search-workflow')

searchWorkflow.addStep(StartEvent, async (context, event) => {
  context.writeEventToStream(new ProgressEvent(
    `searching for ${event.data}...`)
  )
  await sleep(1000)
  context.writeEventToStream(new ReportEvent(event.data))
})

searchWorkflow.addStep(ReportEvent, async (context, event) => {
  context.writeEventToStream(new ProgressEvent(
    `reporting for ${event.data.input}...`)
  )
  await sleep(1000)
  const input = event.data.input
  if (input.startWith('retry:')) {
    context.writeEventToStream(new ResultEvent(input.slice(6), true))
  } else {
    context.writeEventToStream(new RetryEvent(event.data, true))
  }
  context.writeEventToStream(new StopEvent({
    result: null
  }))
})

async function handleWorkflow (
  input: string,
  workflow: AIWorkflow,
  ui: ReturnType<typeof createStreamableUI>,
  aiState: ReturnType<typeof getMutableAIState>
) {
  workflow.run(new StartEvent({ input }))
  for await (const event of workflow.streamEvents()) {
    if (event instanceof AIEvent) {
      const patch = event.UI({ input: event.data.input })
      if (event.userInteraction) {
        ui.done(patch)
        aiState.done({
          ...aiState.get(),
          workflow: workflow.name
        })
      } else {
        ui.update(patch)
      }
    }
  }
}

export async function search (input: string) {
  'use server'
  const aiState = getMutableAIState()
  const ui = createStreamableUI()
  const { workflow } = aiState.get()
  if (workflow === 'search-workflow') {
    // retry?
    input = `retry:${input}`
  }
  handleWorkflow(input, searchWorkflow, ui, aiState)

  return {
    id: crypto.randomUUID(),
    display: ui.value
  }
}

export async function startSearch () {
  'use server'
  const aiState = getMutableAIState()
  const ui = createStreamableUI()
  handleWorkflow('NONE', inputWorkflow, ui, aiState)

  return {
    id: crypto.randomUUID(),
    display: ui.value
  }
}
