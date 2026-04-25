from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Dict
import json

from app.db.session import get_db
from app.models.models import Agent
from app.agents.engine import AgentConfig, TaskConfig, Crew, AgentExecutor
from app.agents.dev_agent import AIDeveloperAgent

router = APIRouter()


class AgentCreate(BaseModel):
    name: str
    role: str
    goal: str
    backstory: str
    model: str = "openai/gpt-oss-120b"
    provider: str = "nvidia"
    tools: List[str] = []


class CrewRunRequest(BaseModel):
    agents: List[Dict]
    tasks: List[Dict]


class DevTaskRequest(BaseModel):
    task: str
    provider: str = "nvidia"
    model: str = "openai/gpt-oss-120b"


@router.get("/")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent))
    agents = result.scalars().all()
    return [
        {"id": a.id, "name": a.name, "role": a.role, "provider": a.provider}
        for a in agents
    ]


@router.post("/", status_code=201)
async def create_agent(data: AgentCreate, db: AsyncSession = Depends(get_db)):
    agent = Agent(
        name=data.name,
        role=data.role,
        goal=data.goal,
        backstory=data.backstory,
        model=data.model,
        provider=data.provider,
        tools=data.tools,
        owner_id="system",
    )
    db.add(agent)
    await db.flush()
    return {"id": agent.id, "name": agent.name}


@router.post("/{agent_id}/run")
async def run_agent(agent_id: str, body: Dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")

    config = AgentConfig(
        name=agent.name,
        role=agent.role,
        goal=agent.goal,
        backstory=agent.backstory,
        model=agent.model,
        provider=agent.provider,
    )
    executor = AgentExecutor(config)
    result_text = await executor.run(body.get("task", ""))
    return {"result": result_text}


@router.post("/{agent_id}/stream")
async def stream_agent(agent_id: str, body: Dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "Agent not found")

    config = AgentConfig(
        name=agent.name,
        role=agent.role,
        goal=agent.goal,
        backstory=agent.backstory,
        model=agent.model,
        provider=agent.provider,
    )
    executor = AgentExecutor(config)

    async def event_stream():
        async for token in executor.stream(body.get("task", "")):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/crew/run")
async def run_crew(request: CrewRunRequest):
    agent_configs = [AgentConfig(**a) for a in request.agents]
    task_configs = [TaskConfig(**t) for t in request.tasks]
    crew = Crew(agent_configs, task_configs)
    result = await crew.run()
    return result


@router.post("/dev/run")
async def run_dev_agent(request: DevTaskRequest):
    dev = AIDeveloperAgent(provider=request.provider, model=request.model)
    result = await dev.run_task(request.task)
    return result
