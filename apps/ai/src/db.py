from __future__ import annotations

import datetime as _dt
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import JSON, Date, DateTime, Integer, String, Text, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class CommitAnalysis(Base):
    """CommitAnalysis 테이블 — Prisma 스키마와 동일 구조."""

    __tablename__ = "commit_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    repository_id: Mapped[str] = mapped_column(String, nullable=False)
    commit_sha: Mapped[str] = mapped_column(String, nullable=False)
    commit_message: Mapped[str] = mapped_column(String, nullable=False)
    committed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    diff_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class Repository(Base):
    """Repository 테이블 — 읽기 전용 (User join으로 access_token 조회용)."""

    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    github_repo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)


class User(Base):
    """User 테이블 — 읽기 전용 (access_token 조회용)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    access_token: Mapped[str] = mapped_column(String, nullable=False)


async def check_analysis_exists(repository_id: str, commit_sha: str) -> bool:
    """이미 분석된 커밋인지 확인한다."""
    async with async_session() as session:
        result = await session.execute(
            text("SELECT 1 FROM commit_analyses WHERE repository_id = :rid AND commit_sha = :sha"),
            {"rid": repository_id, "sha": commit_sha},
        )
        return result.scalar() is not None


async def save_commit_analysis(
    repository_id: str,
    commit_sha: str,
    commit_message: str,
    committed_at: datetime,
    diff_summary: str,
    tags: list[str],
) -> None:
    """CommitAnalysis를 DB에 저장한다. 이미 존재하면 skip (ON CONFLICT DO NOTHING)."""
    async with async_session() as session:
        stmt = (
            pg_insert(CommitAnalysis)
            .values(
                id=str(uuid4()),
                repository_id=repository_id,
                commit_sha=commit_sha,
                commit_message=commit_message,
                committed_at=committed_at,
                diff_summary=diff_summary,
                tags=tags,
            )
            .on_conflict_do_nothing(
                index_elements=["repository_id", "commit_sha"],
            )
        )
        await session.execute(stmt)
        await session.commit()


class DailySummary(Base):
    """DailySummary 테이블 — Prisma 스키마와 동일 구조."""

    __tablename__ = "daily_summaries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[_dt.date] = mapped_column(Date, nullable=False)
    summary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    commit_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    tags: Mapped[list] = mapped_column(JSON, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


async def upsert_daily_summary(
    user_id: str,
    date: _dt.date,
    summary_text: str,
    commit_count: int,
    tags: list[str],
) -> None:
    """DailySummary를 upsert한다. (user_id, date) 기준 ON CONFLICT DO UPDATE."""
    now = datetime.now(timezone.utc)
    async with async_session() as session:
        stmt = (
            pg_insert(DailySummary)
            .values(
                id=str(uuid4()),
                user_id=user_id,
                date=date,
                summary_text=summary_text,
                commit_count=commit_count,
                tags=tags,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["user_id", "date"],
                set_={
                    "summary_text": summary_text,
                    "commit_count": commit_count,
                    "tags": tags,
                    "updated_at": datetime.now(timezone.utc),
                },
            )
        )
        await session.execute(stmt)
        await session.commit()


async def get_commit_analyses_for_date(user_id: str, date: _dt.date) -> list[dict]:
    """주어진 사용자의 특정 날짜 커밋 분석 결과를 조회한다."""
    async with async_session() as session:
        result = await session.execute(
            text(
                "SELECT ca.commit_sha, ca.commit_message,"
                " ca.diff_summary, ca.tags, ca.committed_at"
                " FROM commit_analyses ca"
                " JOIN repositories r ON ca.repository_id = r.id"
                " WHERE r.user_id = :uid"
                " AND ca.committed_at::date = :d"
                " AND ca.deleted_at IS NULL"
                " AND r.deleted_at IS NULL"
            ),
            {"uid": user_id, "d": date},
        )
        rows = result.fetchall()
        return [
            {
                "commit_sha": row[0],
                "commit_message": row[1],
                "diff_summary": row[2],
                "tags": row[3],
                "committed_at": row[4],
            }
            for row in rows
        ]


async def get_user_id_for_repo(repository_id: str) -> Optional[str]:
    """Repository에서 user_id를 조회한다."""
    async with async_session() as session:
        result = await session.execute(
            text("SELECT user_id FROM repositories WHERE id = :rid AND deleted_at IS NULL"),
            {"rid": repository_id},
        )
        row = result.scalar()
        return row if row else None


async def get_access_token_for_repo(repository_id: str) -> Optional[str]:
    """Repository → User join으로 암호화된 access_token을 조회한다."""
    async with async_session() as session:
        result = await session.execute(
            text(
                "SELECT u.access_token FROM repositories r "
                "JOIN users u ON r.user_id = u.id "
                "WHERE r.id = :rid AND r.deleted_at IS NULL"
            ),
            {"rid": repository_id},
        )
        row = result.scalar()
        return row if row else None


class PeriodReport(Base):
    """PeriodReport 테이블 — Prisma 스키마와 동일 구조."""

    __tablename__ = "period_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[_dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[_dt.date] = mapped_column(Date, nullable=False)
    report_type: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[dict] = mapped_column(JSON, nullable=False, server_default=text("'{}'::jsonb"))
    roadmap: Mapped[dict] = mapped_column(JSON, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


async def get_all_active_user_ids() -> list[str]:
    """활성 레포지토리를 가진 모든 사용자 ID를 반환한다."""
    async with async_session() as session:
        result = await session.execute(
            text("SELECT DISTINCT user_id FROM repositories WHERE deleted_at IS NULL"),
        )
        return [row[0] for row in result.fetchall()]


async def get_daily_summaries_for_period(
    user_id: str,
    start_date: _dt.date,
    end_date: _dt.date,
) -> list[dict]:
    """주어진 기간의 DailySummary 행을 조회한다."""
    async with async_session() as session:
        result = await session.execute(
            select(DailySummary).where(
                DailySummary.user_id == user_id,
                DailySummary.date >= start_date,
                DailySummary.date <= end_date,
            )
        )
        rows = result.scalars().all()
        return [
            {
                "date": str(row.date),
                "summary_text": row.summary_text,
                "commit_count": row.commit_count,
                "tags": row.tags,
            }
            for row in rows
        ]


async def check_period_report_exists(
    user_id: str,
    start_date: _dt.date,
    end_date: _dt.date,
    report_type: str,
) -> bool:
    """해당 기간/타입의 PeriodReport가 이미 존재하는지 확인한다."""
    async with async_session() as session:
        result = await session.execute(
            text(
                "SELECT 1 FROM period_reports"
                " WHERE user_id = :uid"
                " AND start_date = :sd"
                " AND end_date = :ed"
                " AND report_type = :rt"
                " AND deleted_at IS NULL"
            ),
            {"uid": user_id, "sd": start_date, "ed": end_date, "rt": report_type},
        )
        return result.scalar() is not None


async def save_period_report(
    user_id: str,
    start_date: _dt.date,
    end_date: _dt.date,
    report_type: str,
    summary: dict,
    roadmap: dict,
) -> None:
    """PeriodReport를 DB에 저장한다. 중복 시 skip."""
    async with async_session() as session:
        stmt = (
            pg_insert(PeriodReport)
            .values(
                id=str(uuid4()),
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
                report_type=report_type,
                summary=summary,
                roadmap=roadmap,
            )
            .on_conflict_do_nothing()
        )
        await session.execute(stmt)
        await session.commit()
