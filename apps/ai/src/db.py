from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Integer, String, Text, func, text
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


async def get_access_token_for_repo(repository_id: str) -> str | None:
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
