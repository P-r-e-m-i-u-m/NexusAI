from celery import Celery
from app.core.config import settings

celery_app = Celery("nexusai", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, kb_id: str, filepath: str, filename: str):
    import asyncio
    from app.rag.pipeline import ingest_document

    try:
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(ingest_document(kb_id, filepath, filename))
        return result
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def run_workflow_task(self, workflow_id: str, input_data: dict):
    return {"workflow_id": workflow_id, "status": "completed", "input": input_data}
