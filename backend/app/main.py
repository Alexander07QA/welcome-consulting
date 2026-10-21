from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import sessions
from app.config import settings

app = FastAPI(title="Gabi")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(sessions.router)
