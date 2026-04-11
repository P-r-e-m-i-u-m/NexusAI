import subprocess
import os
import tempfile
from typing import Dict, List, Optional
from app.services.llm import chat
from app.core.logging import logger


PLANNER_PROMPT = """You are an expert software architect and developer.
Given a task, create a step-by-step plan to implement it.
Return JSON: {"steps": [{"id": 1, "description": "...", "type": "code|command|review"}]}
Only return JSON, no markdown."""

CODER_PROMPT = """You are an expert software engineer.
Given a task and plan, write the implementation.
Return JSON: {{"filename": "...", "content": "...", "language": "python|typescript|bash"}}
Only return JSON, no markdown fences."""

REVIEWER_PROMPT = """You are a senior code reviewer.
Review this code for bugs, security issues, and improvements.
Be concise. Return a brief summary of issues found."""


class AIDeveloperAgent:
    def __init__(self, provider: str = "nvidia", model: str = "openai/gpt-oss-120b"):
        self.provider = provider
        self.model = model
        self.workspace: str = tempfile.mkdtemp(prefix="nexusai_dev_")
        self.history: List[Dict] = []

    async def plan(self, task: str) -> Dict:
        logger.info("dev_agent_plan", task=task[:80])
        response = await chat(
            messages=[
                {"role": "system", "content": PLANNER_PROMPT},
                {"role": "user", "content": f"Task: {task}"},
            ],
            model=self.model,
            provider=self.provider,
        )
        import json
        try:
            return json.loads(response)
        except Exception:
            return {"steps": [{"id": 1, "description": task, "type": "code"}]}

    async def code(self, task: str, context: str = "") -> Dict:
        logger.info("dev_agent_code", task=task[:80])
        import json
        response = await chat(
            messages=[
                {"role": "system", "content": CODER_PROMPT},
                {"role": "user", "content": f"Context:\n{context}\n\nTask: {task}"},
            ],
            model=self.model,
            provider=self.provider,
        )
        try:
            return json.loads(response)
        except Exception:
            return {"filename": "output.py", "content": response, "language": "python"}

    async def review(self, code: str) -> str:
        response = await chat(
            messages=[
                {"role": "system", "content": REVIEWER_PROMPT},
                {"role": "user", "content": f"Review this code:\n\n{code}"},
            ],
            model=self.model,
            provider=self.provider,
        )
        return response

    def execute_command(self, command: str, timeout: int = 30) -> Dict:
        logger.info("dev_agent_exec", command=command)
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True,
                text=True, timeout=timeout, cwd=self.workspace
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "success": result.returncode == 0,
            }
        except subprocess.TimeoutExpired:
            return {"error": "Command timed out", "success": False}
        except Exception as e:
            return {"error": str(e), "success": False}

    def write_file(self, filename: str, content: str) -> str:
        filepath = os.path.join(self.workspace, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            f.write(content)
        return filepath

    async def run_task(self, task: str) -> Dict:
        plan = await self.plan(task)
        results = []
        context = ""

        for step in plan.get("steps", []):
            step_type = step.get("type", "code")
            description = step.get("description", "")

            if step_type == "code":
                code_result = await self.code(description, context=context)
                filename = code_result.get("filename", "output.py")
                content = code_result.get("content", "")
                filepath = self.write_file(filename, content)
                review = await self.review(content)
                results.append({
                    "step": step["id"],
                    "type": "code",
                    "filename": filename,
                    "content": content,
                    "review": review,
                    "filepath": filepath,
                })
                context += f"\n\nFile {filename}:\n{content}"

            elif step_type == "command":
                exec_result = self.execute_command(description)
                results.append({
                    "step": step["id"],
                    "type": "command",
                    "command": description,
                    **exec_result,
                })

        return {"task": task, "plan": plan, "results": results, "workspace": self.workspace}
