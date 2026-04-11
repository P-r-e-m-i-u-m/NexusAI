from locust import HttpUser, task, between
import json


class NexusAIUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        resp = self.client.post("/api/v1/auth/login", data={
            "username": "test@nexusai.com",
            "password": "testpassword123",
        })
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")

    def auth_headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def health_check(self):
        self.client.get("/health")

    @task(2)
    def list_agents(self):
        self.client.get("/api/v1/agents/", headers=self.auth_headers())

    @task(2)
    def list_workflows(self):
        self.client.get("/api/v1/workflows/", headers=self.auth_headers())

    @task(1)
    def llm_chat(self):
        self.client.post("/api/v1/llm/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "nvidia",
            "max_tokens": 50,
        }, headers=self.auth_headers())

    @task(1)
    def get_providers(self):
        self.client.get("/api/v1/llm/providers")
