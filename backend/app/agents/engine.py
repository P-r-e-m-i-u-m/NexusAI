from typing import List, Dict, Optional, AsyncIterator
from dataclasses import dataclass, field
from app.services.llm import chat
from app.core.logging import logger


@dataclass
class AgentConfig:
    name: str
    role: str
    goal: str
    backstory: str
    model: str = "openai/gpt-oss-120b"
    provider: str = "nvidia"
    tools: List[str] = field(default_factory=list)


@dataclass
class TaskConfig:
    description: str
    expected_output: str
    agent_name: str
    context: Optional[str] = None


class AgentExecutor:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.memory: List[Dict[str, str]] = []

    def _system_prompt(self) -> str:
        return f"""You are {self.config.name}, a specialized AI agent.

Role: {self.config.role}
Goal: {self.config.goal}
Backstory: {self.config.backstory}

Always think step by step. Be concise and actionable. 
Format your final answer clearly."""

    async def run(self, task: str, context: Optional[str] = None) -> str:
        messages = [{"role": "system", "content": self._system_prompt()}]
        messages.extend(self.memory[-6:])  # rolling context window

        user_content = task
        if context:
            user_content = (
                f"Context from previous agents:\n{context}\n\nYour task:\n{task}"
            )

        messages.append({"role": "user", "content": user_content})

        logger.info("agent_run", agent=self.config.name, task=task[:80])
        result = await chat(
            messages=messages,
            model=self.config.model,
            provider=self.config.provider,
        )

        if not isinstance(result, str):
            raise TypeError("Expected non-streaming chat() call to return a string")

        self.memory.append({"role": "user", "content": user_content})
        self.memory.append({"role": "assistant", "content": result})

        return result

    async def stream(self, task: str) -> AsyncIterator[str]:
        messages = [{"role": "system", "content": self._system_prompt()}]
        messages.extend(self.memory[-6:])
        messages.append({"role": "user", "content": task})

        stream = await chat(
            messages=messages,
            model=self.config.model,
            provider=self.config.provider,
            stream=True,
        )

        if isinstance(stream, str):
            raise TypeError(
                "Expected streaming chat() call to return an async iterator"
            )

        async for chunk in stream:
            if chunk:
                yield chunk


class Crew:
    """Orchestrates multiple agents working together on a goal."""

    def __init__(self, agents: List[AgentConfig], tasks: List[TaskConfig]):
        self.agents = {a.name: AgentExecutor(a) for a in agents}
        self.tasks = tasks

    async def run(self, on_progress=None) -> Dict:
        results: Dict[str, str] = {}
        context_chain: List[str] = []

        for i, task in enumerate(self.tasks):
            agent = self.agents.get(task.agent_name)
            if not agent:
                raise ValueError(f"Agent '{task.agent_name}' not found in crew")

            context = "\n\n".join(context_chain) if context_chain else None

            if on_progress:
                await on_progress(
                    {"step": i + 1, "agent": task.agent_name, "status": "running"}
                )

            result = await agent.run(task.description, context=context)
            results[task.agent_name] = result
            context_chain.append(f"[{task.agent_name}]: {result}")

            logger.info("task_complete", agent=task.agent_name, step=i + 1)

            if on_progress:
                await on_progress(
                    {
                        "step": i + 1,
                        "agent": task.agent_name,
                        "status": "done",
                        "result": result[:200],
                    }
                )

        return {"results": results, "final": context_chain[-1] if context_chain else ""}


class GraphAgent:
    """LangGraph-style stateful agent with human-in-the-loop support."""

    def __init__(self, nodes: Dict, edges: List[tuple]):
        self.nodes = nodes  # {node_name: callable}
        self.edges = edges  # [(from, to)] or [(from, to, condition_fn)]
        self.state: Dict = {}
        self.checkpoints: List[Dict] = []
        self.paused_at: Optional[str] = None

    async def run(
        self, initial_state: Dict, human_in_loop_nodes: Optional[List[str]] = None
    ) -> Dict:
        self.state = initial_state.copy()
        human_nodes = human_in_loop_nodes or []
        current = list(self.nodes.keys())[0]

        while current:
            if current in human_nodes:
                self.paused_at = current
                self.checkpoints.append({"node": current, "state": self.state.copy()})
                return {
                    "status": "awaiting_human",
                    "paused_at": current,
                    "state": self.state,
                }

            node_fn = self.nodes.get(current)
            if node_fn:
                logger.info("graph_node", node=current)
                self.state = await node_fn(self.state)
                self.checkpoints.append({"node": current, "state": self.state.copy()})

            current = self._next_node(current)

        return {"status": "complete", "state": self.state}

    def resume(self, human_input: Dict) -> None:
        self.state.update(human_input)
        self.paused_at = None

    def _next_node(self, current: str) -> Optional[str]:
        for edge in self.edges:
            if edge[0] == current:
                if len(edge) == 3:
                    condition_fn = edge[2]
                    if condition_fn(self.state):
                        return edge[1]
                else:
                    return edge[1]
        return None
