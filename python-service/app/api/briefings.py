from __future__ import annotations

from functools import lru_cache
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.briefing import BriefingCreate, BriefingRead, ReportGenerationResponse
from app.services.briefing_service import (
    BriefingNotFoundError,
    ReportNotGeneratedError,
    create_briefing,
    generate_report,
    get_briefing,
    get_report_html,
)
from app.services.report_formatter import ReportFormatter

router = APIRouter(prefix="/briefings", tags=["briefings"])


@lru_cache(maxsize=1)
def get_report_formatter() -> ReportFormatter:
    return ReportFormatter()


@router.post("", response_model=BriefingRead, status_code=status.HTTP_201_CREATED)
def create_briefing_endpoint(
    payload: BriefingCreate, db: Annotated[Session, Depends(get_db)]
) -> BriefingRead:
    briefing = create_briefing(db, payload)
    return BriefingRead.model_validate(briefing)


@router.get("/{briefing_id}", response_model=BriefingRead)
def get_briefing_endpoint(
    briefing_id: Annotated[UUID, Path(description="Briefing identifier (UUID)")],
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    try:
        briefing = get_briefing(db, briefing_id)
    except BriefingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Briefing not found") from exc
    return BriefingRead.model_validate(briefing)


@router.post("/{briefing_id}/generate", response_model=ReportGenerationResponse)
def generate_report_endpoint(
    briefing_id: Annotated[UUID, Path(description="Briefing identifier (UUID)")],
    db: Annotated[Session, Depends(get_db)],
    formatter: Annotated[ReportFormatter, Depends(get_report_formatter)],
) -> ReportGenerationResponse:
    try:
        briefing = generate_report(db, briefing_id, formatter)
    except BriefingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Briefing not found") from exc

    assert briefing.generated_at is not None  # for type checkers
    return ReportGenerationResponse(
        id=briefing.id,
        generated=True,
        generated_at=briefing.generated_at,
        html=briefing.generated_html or "",
    )


@router.get("/{briefing_id}/html", response_class=Response)
def get_report_html_endpoint(
    briefing_id: Annotated[UUID, Path(description="Briefing identifier (UUID)")],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        html = get_report_html(db, briefing_id)
    except BriefingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Briefing not found") from exc
    except ReportNotGeneratedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report has not been generated yet",
        ) from exc

    return Response(content=html, media_type="text/html")
