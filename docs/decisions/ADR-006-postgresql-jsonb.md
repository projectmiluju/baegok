# ADR-006: PostgreSQL 단일 DB (MongoDB 제외)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

AI 분석 결과(요약 텍스트, 태그 배열, 로드맵 등)는 비정형 데이터이다.
일반적으로 AI 프로젝트에서는 PostgreSQL + MongoDB를 병행하는 경우가 많다.

## 고려한 선택지

### 선택지 A: PostgreSQL + MongoDB
- 장점: 비정형 데이터에 MongoDB가 자연스러움, AI 프로젝트에서 흔한 패턴
- 단점: DB 2개 관리, Docker Compose 서비스 추가, ORM 2개

### 선택지 B: PostgreSQL JSONB로 통일
- 장점: DB 1개로 단순화, Prisma로 통일 관리, AWS RDS 하나로 충분
- 단점: 복잡한 문서 쿼리에서 MongoDB보다 불편

## 결정 (Decision)

**선택지 B: PostgreSQL JSONB로 통일.**
v1의 비정형 데이터는 AI 요약 텍스트, 태그 배열, 로드맵 JSON 정도이며
JSONB 컬럼으로 충분히 대응 가능하다.
DB를 하나로 유지하면 인프라 복잡도와 비용이 줄어든다.

## 결과 (Consequences)

- 긍정적: 인프라 단순화, 비용 절감, Prisma 단일 ORM
- 부정적: 향후 RAG/벡터 검색 도입 시 pgvector 확장 또는 별도 DB 검토 필요
- 리스크: 비정형 쿼리가 복잡해지면 성능 이슈

## 되돌릴 조건 (Reversal Triggers)

- JSONB 쿼리 성능이 병목이 되거나, 문서 구조가 깊고 복잡해지면 MongoDB 도입
