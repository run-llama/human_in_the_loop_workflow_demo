# bring in our imports
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
from hitlworkflow import HITLWorkflow, ProgressEvent
from llama_index.core.workflow.events import (
    InputRequiredEvent,
    HumanResponseEvent
)
from llama_index.core.workflow.handler import WorkflowHandler

# create our FastAPI app
app = FastAPI()

# create a websocket endpoint for our app
@app.websocket("/query")
async def query_endpoint(websocket: WebSocket):
    await websocket.accept()

    # instantiate our workflow with no timeout
    workflow = HITLWorkflow(timeout=None, verbose=False)

    try:
        # the first thing we should receive is a query
        query_data = await websocket.receive_json()
        # we pass it to the workflow
        handler: WorkflowHandler = workflow.run(query=query_data["question"])

        # now we handle events coming back from the workflow
        async for event in handler.stream_events():
            # if we get an InputRequiredEvent, that means the workflow needs human input
            # so we send an event to the frontend that will be handled specially
            if isinstance(event, InputRequiredEvent):
                await websocket.send_json({
                    "type": "input_required",
                    "payload": event.payload
                })
                # we expect the next thing from the socket to be human input
                response = await websocket.receive_json()
                # which we send back to the workflow as a HumanResponseEvent
                handler.ctx.send_event(HumanResponseEvent(response=response["response"]))
            elif isinstance(event, ProgressEvent):
                # the workflow also emits progress events which we send to the frontend
                await websocket.send_json({
                    "type": "progress", 
                    "payload": str(event.msg)
                })

        # this only happens when the workflow is complete
        final_result = await handler
        await websocket.send_json({
            "type": "final_result", 
            "payload": str(final_result)
        })

    except Exception as e:
        await websocket.send_json({"type": "error", "payload": str(e)})
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
