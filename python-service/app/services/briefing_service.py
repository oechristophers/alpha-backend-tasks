from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.briefing import Briefing, BriefingKeyPoint, BriefingMetric, BriefingRisk
from app.schemas.briefing import BriefingCreate, ReportViewModel
from app.services.report_formatter import ReportFormatter


class BriefingNotFoundError(Exception):
    """Raised when a requested briefing cannot be located."""


class ReportNotGeneratedError(Exception):
    """Raised when a report is requested before generation has occurred."""


def _load_briefing(db: Session, briefing_id: UUID) -> Briefing:
    query = (
        select(Briefing)
        .where(Briefing.id == briefing_id)
        .options(
            selectinload(Briefing.key_points),
            selectinload(Briefing.risks),
            selectinload(Briefing.metrics),
        )
    )
    briefing = db.scalar(query)
    if not briefing:
        raise BriefingNotFoundError
    return briefing


def create_briefing(db: Session, payload: BriefingCreate) -> Briefing:
    briefing = Briefing(
        company_name=payload.company_name,
        ticker=payload.ticker,
        sector=payload.sector,
        analyst_name=payload.analyst_name,
        summary=payload.summary,
        recommendation=payload.recommendation,
    )

    for idx, point in enumerate(payload.key_points, start=1):
        briefing.key_points.append(
            BriefingKeyPoint(content=point, position=idx)
        )

    for idx, risk in enumerate(payload.risks, start=1):
        briefing.risks.append(
            BriefingRisk(description=risk, position=idx)
        )

    for idx, metric in enumerate(payload.metrics, start=1):
        briefing.metrics.append(
            BriefingMetric(name=metric.name, value=metric.value, position=idx)
        )

    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    return briefing


def get_briefing(db: Session, briefing_id: UUID) -> Briefing:
    return _load_briefing(db, briefing_id)


def _build_view_model(briefing: Briefing, generated_at: datetime) -> ReportViewModel:
    display_generated_at = generated_at.astimezone(timezone.utc).strftime("%b %d, %Y at %I:%M %p UTC")

    return ReportViewModel(
        title=f"{briefing.company_name} ({briefing.ticker}) - Briefing Report",
        company={
            "companyName": briefing.company_name,
            "ticker": briefing.ticker,
            "sector": briefing.sector,
            "analystName": briefing.analyst_name,
        },
        summary=briefing.summary,
        recommendation=briefing.recommendation,
        key_points=[
            {"position": point.position, "content": point.content}
            for point in sorted(briefing.key_points, key=lambda p: p.position)
        ],
        risks=[
            {"position": risk.position, "description": risk.description}
            for risk in sorted(briefing.risks, key=lambda r: r.position)
        ],
        metrics=[
            {"position": metric.position, "name": metric.name, "value": metric.value}
            for metric in sorted(briefing.metrics, key=lambda m: m.position)
        ],
        generated_at=display_generated_at,
    )


def generate_report(db: Session, briefing_id: UUID, formatter: ReportFormatter) -> Briefing:
    briefing = _load_briefing(db, briefing_id)
    generated_at = datetime.now(timezone.utc)
    view_model = _build_view_model(briefing, generated_at)
    html = formatter.render_briefing_report(view_model.model_dump())

    briefing.generated_html = html
    briefing.generated_at = generated_at

    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    return briefing


def get_report_html(db: Session, briefing_id: UUID) -> str:
    briefing = _load_briefing(db, briefing_id)
    if not briefing.generated_html:
        raise ReportNotGeneratedError
    return briefing.generated_html
