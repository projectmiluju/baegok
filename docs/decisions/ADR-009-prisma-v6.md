# ADR-009: Prisma 6 사용 (v7 다운그레이드)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

Issue #1 환경 세팅 중 Prisma를 설치했더니 v7.6.0이 설치되었다.
Prisma 7은 `datasource url` 문법을 제거하는 breaking change가 있었다.
기존 `schema.prisma`의 `url = env("DATABASE_URL")` 패턴이 더 이상 동작하지 않고,
`prisma.config.ts`를 별도로 작성해야 한다.

## 고려한 선택지

### 선택지 A: Prisma 7 + 새 설정 방식

- 장점: 최신 버전, 장기적으로 올바른 선택
- 단점: 설정 방식이 완전히 바뀜, 마이그레이션 가이드 학습 필요, D-6에 시간 낭비

### 선택지 B: Prisma 6으로 다운그레이드

- 장점: 기존 `datasource url` 패턴 그대로 사용, 즉시 동작, 레퍼런스 풍부
- 단점: 최신 버전이 아님 (v6.19.3)

## 결정 (Decision)

**선택지 B: Prisma 6으로 다운그레이드.**
D-6에 Prisma 7의 새 설정 패턴을 학습하고 적용할 시간이 없다.
Prisma 6은 안정적이고, 현재 필요한 모든 기능(CRUD, 마이그레이션, JSONB)을 지원한다.

## 결과 (Consequences)

- 긍정적: 즉시 동작, 안정적 버전, 풍부한 레퍼런스
- 부정적: v7 도입 시 마이그레이션 필요
- 리스크: 없음 (v6은 장기 지원 중)

## 되돌릴 조건 (Reversal Triggers)

- 공모전 이후 여유가 생기면 Prisma 7로 마이그레이션 검토
- Prisma 6 EOL 발표 시
