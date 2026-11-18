from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Routers registered here as they are built:
# from app.api import auth, documents, regulations, reports
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
# app.include_router(regulations.router, prefix="/api/regulations", tags=["regulations"])
# app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
