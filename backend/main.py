import os
import json
from typing import List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import google.generativeai as genai

app = FastAPI(title="Forum", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket

        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "data": {"status": "connected", "is_moderator": True}
        }))

    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove stale connections
                self.active_connections.remove(connection)

manager = ConnectionManager()


class QuestionData(BaseModel):
    id: str
    title: str
    content: str
    author: dict
    createdAt: str
    updatedAt: str

class ResponseData(BaseModel):
    id: str
    content: str
    postId: str
    author: dict
    createdAt: str

class AIRequest(BaseModel):
    prompt: str
    type: str = "question"


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    user_id = None
    try:
        await manager.connect(websocket)

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)

                if "token" in message:
                    user_id = "user_" + str(hash(message["token"]))[:8]
                    manager.user_connections[user_id] = websocket

                # elif message.get("type") == "ping":
                #     await websocket.send_text(json.dumps({"type": "pong"}))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "data": {"message": "Invalid JSON format"}
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)


@app.post("/broadcast/new-question")
async def broadcast_new_question(question: QuestionData):
    try:
        # Broadcast to all connected clients
        await manager.broadcast(json.dumps({
            "type": "new_question",
            "data": question.dict()
        }))

        # Send Slack notifications
        await send_slack_notification(question)

        return {"status": "success", "message": "Question broadcasted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast question: {str(e)}")


@app.post("/broadcast/new-response")
async def broadcast_new_response(response: ResponseData):
    try:
        # Broadcast to all connected clients
        await manager.broadcast(json.dumps({
            "type": "new_response",
            "data": response.dict()
        }))

        return {"status": "success", "message": "Response broadcasted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast response: {str(e)}")


@app.post("/ai/generate")
async def generate_ai_content(request: AIRequest):
    try:
        if not os.getenv("GEMINI_API_KEY"):
            raise HTTPException(status_code=500, detail="AI service not configured")

        full_prompt = f"Write me an answer to this question in plain text with no markdown or other styling: {request.prompt}"

        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(full_prompt)

        return {
            "status": "success",
            "generated_content": response.text
        }
    except Exception as e:
        print(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


async def send_slack_notification(question: QuestionData):
    try:
        author_name = question.author.get('name', 'Anonymous')
        message = {
            "text": f"🆕 New Question Posted: {question.title}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🆕 New Forum Question"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Title:*\n{question.title}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Posted by:*\n{author_name}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Content:*\n{question.content[:200]}{'...' if len(question.content) > 200 else ''}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "View Question"
                            },
                            "url": f"http://localhost:3000/p/{question.id}",
                            "style": "primary"
                        }
                    ]
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                SLACK_WEBHOOK_URL,
                json=message,
                headers={"Content-Type": "application/json"}
            )

        if response.status_code == 200:
            print(f"Slack notification sent successfully for question: {question.title}")
        else:
            print(f"Failed to send Slack notification: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Failed to send Slack notification: {e}")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "services": {
            "slack_webhook": bool(SLACK_WEBHOOK_URL),
            "gemini": bool(os.getenv("GEMINI_API_KEY"))
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
