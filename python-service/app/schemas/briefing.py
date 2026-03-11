from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MetricInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=120)


class MetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str = Field(serialization_alias="name")
    value: str = Field(serialization_alias="value")
    position: int = Field(serialization_alias="position")


class KeyPointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    content: str = Field(serialization_alias="content")
    position: int = Field(serialization_alias="position")


class RiskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    description: str = Field(serialization_alias="description")
    position: int = Field(serialization_alias="position")


class BriefingCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    company_name: Annotated[str, Field(min_length=1, max_length=200, validation_alias="companyName")]
    ticker: str = Field(min_length=1, max_length=16)
    sector: str | None = Field(default=None, max_length=120)
    analyst_name: Annotated[str | None, Field(default=None, max_length=120, validation_alias="analystName")]
    summary: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)
    key_points: Annotated[list[str], Field(validation_alias="keyPoints")]
    risks: list[str] = Field()
    metrics: Annotated[list[MetricInput], Field(default_factory=list, validation_alias="metrics")]

    @model_validator(mode="after")
    def _normalize_and_validate(self) -> BriefingCreate:
        self.company_name = self.company_name.strip()
        self.ticker = self.ticker.strip().upper()
        self.sector = self.sector.strip() if self.sector else None
        self.analyst_name = self.analyst_name.strip() if self.analyst_name else None
        self.summary = self.summary.strip()
        self.recommendation = self.recommendation.strip()
        self.key_points = [point.strip() for point in self.key_points if point and point.strip()]
        self.risks = [risk.strip() for risk in self.risks if risk and risk.strip()]

        if len(self.key_points) < 2:
            raise ValueError("At least two keyPoints are required.")
        if len(self.risks) < 1:
            raise ValueError("At least one risk is required.")
        if not self.summary:
            raise ValueError("Summary is required.")
        if not self.recommendation:
            raise ValueError("Recommendation is required.")

        seen_metric_names: set[str] = set()
        normalized_metrics: list[MetricInput] = []
        for metric in self.metrics:
            name = metric.name.strip()
            value = metric.value.strip()
            if not name:
                raise ValueError("Metric name cannot be empty.")
            if not value:
                raise ValueError("Metric value cannot be empty.")
            lowered = name.lower()
            if lowered in seen_metric_names:
                raise ValueError("Metric names must be unique within a briefing.")
            seen_metric_names.add(lowered)
            normalized_metrics.append(MetricInput(name=name, value=value))
        self.metrics = normalized_metrics

        return self


class BriefingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID = Field(serialization_alias="id")
    company_name: str = Field(serialization_alias="companyName")
    ticker: str = Field(serialization_alias="ticker")
    sector: str | None = Field(serialization_alias="sector")
    analyst_name: str | None = Field(serialization_alias="analystName")
    summary: str = Field(serialization_alias="summary")
    recommendation: str = Field(serialization_alias="recommendation")
    key_points: list[KeyPointRead] = Field(serialization_alias="keyPoints")
    risks: list[RiskRead] = Field(serialization_alias="risks")
    metrics: list[MetricRead] = Field(serialization_alias="metrics")
    generated_at: datetime | None = Field(serialization_alias="generatedAt")
    created_at: datetime = Field(serialization_alias="createdAt")


class ReportGenerationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID = Field(serialization_alias="id")
    generated: bool = Field(serialization_alias="generated")
    generated_at: datetime = Field(serialization_alias="generatedAt")
    html: str = Field(serialization_alias="html")


class ReportHtmlResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    html: str = Field(serialization_alias="html")


class ReportViewModel(BaseModel):
    """Shape passed into templates, kept separate from ORM types for clarity."""

    model_config = ConfigDict(populate_by_name=True)

    title: str
    company: dict[str, Any]
    summary: str
    recommendation: str
    key_points: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    metrics: list[dict[str, Any]]
    generated_at: str
