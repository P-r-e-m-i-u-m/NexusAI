from sqlalchemy import Column, String, Text, Boolean, Integer, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.db.session import BaseModel


class UserRole(str, enum.Enum):
    admin = "admin"
    developer = "developer"
    viewer = "viewer"


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.developer)
    is_active = Column(Boolean, default=True)
    api_key = Column(String(64), unique=True, index=True)

    agents = relationship("Agent", back_populates="owner", cascade="all, delete-orphan")
    workflows = relationship(
        "Workflow", back_populates="owner", cascade="all, delete-orphan"
    )


class Agent(BaseModel):
    __tablename__ = "agents"

    name = Column(String(100), nullable=False)
    description = Column(Text)
    role = Column(String(100))
    goal = Column(Text)
    backstory = Column(Text)
    model = Column(String(100), default="openai/gpt-oss-120b")
    provider = Column(String(50), default="nvidia")
    tools = Column(JSON, default=list)
    config = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="agents")
    tasks = relationship("Task", back_populates="agent", cascade="all, delete-orphan")


class Workflow(BaseModel):
    __tablename__ = "workflows"

    name = Column(String(100), nullable=False)
    description = Column(Text)
    graph = Column(JSON, default=dict)  # node/edge definition for visual builder
    status = Column(String(20), default="draft")
    is_active = Column(Boolean, default=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="workflows")
    runs = relationship(
        "WorkflowRun", back_populates="workflow", cascade="all, delete-orphan"
    )


class WorkflowRun(BaseModel):
    __tablename__ = "workflow_runs"

    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending|running|success|failed
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    error = Column(Text)
    duration_ms = Column(Integer)
    tokens_used = Column(Integer, default=0)

    workflow = relationship("Workflow", back_populates="runs")


class Task(BaseModel):
    __tablename__ = "tasks"

    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    description = Column(Text, nullable=False)
    expected_output = Column(Text)
    status = Column(String(20), default="pending")
    result = Column(Text)
    tokens_used = Column(Integer, default=0)

    agent = relationship("Agent", back_populates="tasks")


class KnowledgeBase(BaseModel):
    __tablename__ = "knowledge_bases"

    name = Column(String(100), nullable=False)
    description = Column(Text)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    documents = relationship(
        "Document", back_populates="kb", cascade="all, delete-orphan"
    )


class Document(BaseModel):
    __tablename__ = "documents"

    kb_id = Column(String, ForeignKey("knowledge_bases.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500))
    content = Column(Text)
    chunk_count = Column(Integer, default=0)
    status = Column(String(20), default="pending")

    kb = relationship("KnowledgeBase", back_populates="documents")


class ApiKey(BaseModel):
    __tablename__ = "api_keys"

    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), nullable=False)
    last_used_at = Column(String)
    is_active = Column(Boolean, default=True)
    permissions = Column(JSON, default=list)
