import re
import json
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SQL_PATTERNS = re.compile(
    r"(\bDROP\b|\bDELETE\b|\bTRUNCATE\b|--|;|/\*|\*/|UNION\s+SELECT|xp_|EXEC\s*\()",
    re.IGNORECASE,
)
XSS_PATTERNS = re.compile(
    r"(<script|</script|javascript:|<iframe|on\w+\s*=|<img[^>]+onerror)",
    re.IGNORECASE,
)
DANGEROUS_IMPORTS = re.compile(
    r"\b(import\s+os|import\s+subprocess|import\s+sys|eval\s*\(|exec\s*\(|__import__)\b"
)
SSRF_PATTERNS = re.compile(
    r"(169\.254\.|127\.|10\.|192\.168\.|localhost|metadata\.google|169\.254\.169\.254)"
)
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/ogg",
    "image/jpeg",
    "image/png",
    "image/gif",
}
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


def sanitize_string(value: str) -> str:
    if SQL_PATTERNS.search(value):
        raise ValueError("Potentially malicious SQL pattern detected")
    if XSS_PATTERNS.search(value):
        raise ValueError("Potentially malicious HTML/XSS pattern detected")
    return value.strip()


def sanitize_code(value: str) -> str:
    if DANGEROUS_IMPORTS.search(value):
        raise ValueError("Dangerous code pattern detected")
    return value


def validate_url(url: str) -> str:
    if SSRF_PATTERNS.search(url):
        raise ValueError("URL points to internal/restricted resource (SSRF prevention)")
    if not url.startswith(("http://", "https://")):
        raise ValueError("Only HTTP/HTTPS URLs allowed")
    return url


class InputValidationMiddleware(BaseHTTPMiddleware):
    SKIP_PATHS = {"/health", "/metrics", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            try:
                body = await request.body()
                if body:
                    data = json.loads(body)
                    self._validate_dict(data)
            except ValueError as e:
                return JSONResponse(status_code=400, content={"error": str(e)})
            except json.JSONDecodeError:
                return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

        return await call_next(request)

    def _validate_dict(self, data, depth=0):
        if depth > 10:
            return
        if isinstance(data, dict):
            for k, v in data.items():
                self._validate_dict(v, depth + 1)
        elif isinstance(data, list):
            for item in data:
                self._validate_dict(item, depth + 1)
        elif isinstance(data, str) and len(data) < 10_000:
            sanitize_string(data)
