from fastapi import FastAPI
from pydantic import BaseModel
from llama_index.core.workflow import (
    Workflow,
    step,
    Event,
    Context
)
from llama_index.core.workflow.events import (
    StartEvent,
    StopEvent,
    InputRequiredEvent,
    HumanResponseEvent
)
from llama_index.core.workflow.handler import WorkflowHandler

class RetryEvent(Event):
    pass

class ReportEvent(Event):
    pass

class ProgressEvent(Event):
    pass

class HITLWorkflow(Workflow):
    @step
    async def first_step(self, ctx: Context, ev: StartEvent | RetryEvent) -> InputRequiredEvent:
        ctx.write_event_to_stream(ProgressEvent(msg=f"I am doing some research on the subject of {ev.query}"))
        await ctx.set("original_query", ev.query)
        return InputRequiredEvent(prefix="Why do I need a prefix", payload=f"Here is the research I have done so far on '{ev.query}': Lorem ipsum.")
    
    @step
    async def second_step(self, ctx: Context, ev: HumanResponseEvent) -> ReportEvent | RetryEvent:
        ctx.write_event_to_stream(ProgressEvent(msg=f"The human has responded: {ev.response}"))
        if (ev.response == "yes"):
            return ReportEvent(result=f"Here is the research on {await ctx.get('original_query')}")
        else:
            ctx.write_event_to_stream(ProgressEvent(msg=f"The human has rejected the research, retrying"))
            return RetryEvent(query=await ctx.get("original_query"))
        
    @step
    async def third_step(self, ctx: Context, ev: ReportEvent) -> StopEvent:
        ctx.write_event_to_stream(ProgressEvent(msg=f"The human has approved the research, generating final report"))
        # generate a report here
        return StopEvent(result=f"This is a report on {await ctx.get('original_query')}")

app = FastAPI()

class Query(BaseModel):
    question: str

from fastapi import WebSocket

@app.websocket("/query")
async def query_endpoint(websocket: WebSocket):
    await websocket.accept()
    workflow = HITLWorkflow(timeout=3000, verbose=False)

    try:
        query_data = await websocket.receive_json()
        handler: WorkflowHandler = workflow.run(query=query_data["question"])

        async for event in handler.stream_events():
            if isinstance(event, InputRequiredEvent):
                await websocket.send_json({
                    "type": "input_required",
                    "payload": event.payload
                })
                response = await websocket.receive_json()
                print("Got response ",response)
                handler.ctx.send_event(HumanResponseEvent(response=response["response"]))
            elif isinstance(event, (ProgressEvent)):
                await websocket.send_json({"type": "progress", "payload": str(event.msg)})

        final_result = await handler
        await websocket.send_json({"type": "final_result", "payload": str(final_result)})

    except Exception as e:
        await websocket.send_json({"type": "error", "payload": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
