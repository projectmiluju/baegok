# 프로젝트 현황

**최종 업데이트:** 2026-04-07
**현재 버전:** v0.0.0 (MVP1 개발 중)
**배포 URL:** 미정

## 최근 변경

- Issue #1: 모노레포 구조 및 개발 환경 세팅 완료
  - 모노레포 (apps/web, api, ai, mcp) + bun 워크스페이스
  - Docker Compose (PostgreSQL 16, Redis 7, Kafka + Zookeeper)
  - Prisma 6 스키마 (5개 모델)
  - 린트/포맷터 (ESLint + Prettier, Ruff + Black)
  - Git 훅 (Husky + lint-staged + commitlint)
  - CI/CD (GitHub Actions)
- ADR 9건 작성 (ADR-009: Prisma 6 다운그레이드 추가)

## 알려진 이슈

| 이슈                           | 심각도 | 상태                       |
| ------------------------------ | ------ | -------------------------- |
| develop 기본 브랜치 설정 필요  | P1     | push 후 GitHub 웹에서 설정 |
| Branch protection rules 미설정 | P1     | push 후 GitHub 웹에서 설정 |
| Prisma 마이그레이션 미실행     | P2     | Docker 기동 후 실행        |

## 기술 부채

| 항목                           | 등록일     | 예상 작업량 |
| ------------------------------ | ---------- | ----------- |
| Prisma 6 → 7 마이그레이션      | 2026-04-07 | M           |
| deploy.yml 실제 배포 로직 구현 | 2026-04-07 | M           |

## 다음 계획

- [x] 모노레포 구조 생성 (web, api, ai, mcp)
- [x] Docker Compose (PostgreSQL, Redis, Kafka)
- [x] DB 스키마 (Prisma)
- [x] 협업 환경 풀세팅 (린트, 훅, CI/CD)
- [ ] GitHub OAuth 로그인
- [ ] Webhook 수신 → Kafka → AI 분석 파이프라인
- [ ] 대시보드 UI
- [ ] MCP 서버
- [ ] AWS 배포
