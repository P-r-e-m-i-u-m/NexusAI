from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict, Optional

from app.db.session import get_db
from app.models.models import Workflow, WorkflowRun

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    graph: Dict = {}


class WorkflowRun_(BaseModel):
    input_data: Dict = {}


@router.get("/")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow))
    wfs = result.scalars().all()
    return [{"id": w.id, "name": w.name, "status": w.status} for w in wfs]


@router.post("/", status_code=201)
async def create_workflow(data: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    wf = Workflow(
        name=data.name,
        description=data.description,
        graph=data.graph,
        owner_id="system",
    )
    db.add(wf)
    await db.flush()
    return {"id": wf.id, "name": wf.name}


@router.get("/{wf_id}")
async def get_workflow(wf_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return {"id": wf.id, "name": wf.name, "graph": wf.graph, "status": wf.status}


@router.put("/{wf_id}")
async def update_workflow(
    wf_id: str, data: WorkflowCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    wf.name = data.name
    wf.description = data.description
    wf.graph = data.graph
    return {"id": wf.id, "name": wf.name}


@router.post("/{wf_id}/run")
async def run_workflow(
    wf_id: str, body: WorkflowRun_, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Workflow).where(Workflow.id == wf_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")

    run = WorkflowRun(workflow_id=wf_id, status="running", input_data=body.input_data)
    db.add(run)
    await db.flush()
    return {"run_id": run.id, "status": "running"}


@router.get("/{wf_id}/runs")
async def get_runs(wf_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkflowRun).where(WorkflowRun.workflow_id == wf_id)
    )
    runs = result.scalars().all()
    return [
        {"id": r.id, "status": r.status, "created_at": str(r.created_at)} for r in runs
    ]
