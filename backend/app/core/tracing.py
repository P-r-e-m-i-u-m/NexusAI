from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from app.core.config import settings
from app.core.logging import logger

_tracer = None


def setup_tracing(app=None):
    global _tracer
    resource = Resource.create({"service.name": "nexusai-backend", "service.version": "1.0.0"})
    provider = TracerProvider(resource=resource)

    try:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        exporter = OTLPSpanExporter(endpoint=getattr(settings, "JAEGER_ENDPOINT", "http://localhost:4318/v1/traces"))
        provider.add_span_processor(BatchSpanProcessor(exporter))
        logger.info("tracing_initialized", exporter="otlp")
    except Exception as e:
        logger.warning("tracing_exporter_failed", error=str(e))

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer("nexusai")

    if app:
        FastAPIInstrumentor.instrument_app(app)

    return _tracer


def get_tracer():
    global _tracer
    if not _tracer:
        _tracer = trace.get_tracer("nexusai")
    return _tracer


def trace_span(name: str, attributes: dict = None):
    """Context manager for custom spans."""
    from contextlib import contextmanager

    @contextmanager
    def _span():
        tracer = get_tracer()
        with tracer.start_as_current_span(name) as span:
            if attributes:
                for k, v in attributes.items():
                    span.set_attribute(k, str(v))
            yield span

    return _span()
