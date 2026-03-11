from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ticker: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    sector: Mapped[str | None] = mapped_column(String(120), nullable=True)
    analyst_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    generated_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    key_points: Mapped[list[BriefingKeyPoint]] = relationship(
        back_populates="briefing", cascade="all, delete-orphan", order_by="BriefingKeyPoint.position"
    )
    risks: Mapped[list[BriefingRisk]] = relationship(
        back_populates="briefing", cascade="all, delete-orphan", order_by="BriefingRisk.position"
    )
    metrics: Mapped[list[BriefingMetric]] = relationship(
        back_populates="briefing", cascade="all, delete-orphan", order_by="BriefingMetric.position"
    )


class BriefingKeyPoint(Base):
    __tablename__ = "briefing_key_points"

    briefing_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("briefings.id", ondelete="CASCADE"), nullable=False, index=True, primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    briefing: Mapped[Briefing] = relationship(back_populates="key_points")


class BriefingRisk(Base):
    __tablename__ = "briefing_risks"

    briefing_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("briefings.id", ondelete="CASCADE"), nullable=False, index=True, primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    briefing: Mapped[Briefing] = relationship(back_populates="risks")


class BriefingMetric(Base):
    __tablename__ = "briefing_metrics"
    __table_args__ = (
        UniqueConstraint("briefing_id", "name", name="uq_briefing_metric_name"),
    )

    briefing_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("briefings.id", ondelete="CASCADE"), nullable=False, index=True, primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    briefing: Mapped[Briefing] = relationship(back_populates="metrics")
