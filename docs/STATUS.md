# 프로젝트 현황

**최종 업데이트:** 2026-04-13
**현재 버전:** v0.1.0 (예정 — Issue #3 머지 시점)
**배포 URL:** 미정

## 최근 변경

- **Issue #12 — AWS 배포 (QA 승인)**
  - Dockerfile 3개 (api/Bun, web/Next.js standalone, ai/Python 3.9)
  - docker-compose.prod.yml: 7 서비스 (nginx, web, api, ai, celery-worker, celery-beat, kafka+zk)
  - Nginx 리버스 프록시 (/ → Next.js, /api → Node API)
  - GitHub Actions deploy.yml: main 머지 시 SSH 배포 + Prisma migrate
  - .env.production.example, .dockerignore
  - QA 리뷰에서 P0 2건(패키지 매니저 혼재, frozen-lockfile) + P1 3건 발견 → 수정 완료
- **Issue #11 — MCP 서버 (QA 승인)**
  - @modelcontextprotocol/sdk 기반 stdio 트랜스포트 MCP 서버
  - 4개 도구: `get_daily_summary`, `list_recent_summaries`, `get_period_report`, `get_roadmap`
  - JWT Bearer 인증 API 클라이언트, 한글 포맷 출력
  - PR 리뷰에서 API 응답 엔벨로프 미언랩 P0 5건 발견 → 수정 완료
  - 프론트엔드 roadmap snake_case 불일치 런타임 에러 발견 → 수정 완료
  - 5개 테스트
- **Issue #10 — 대시보드 UI (QA 승인)**
  - Next.js 16 프론트엔드: 랜딩/OAuth 콜백/대시보드/레포 관리/리포트 목록·상세 (7 라우트)
  - Notion 스타일 디자인 시스템 (Growth Teal + Warm Neutrals)
  - 8개 컴포넌트 (StatCard, DailySummaryCard, RepoCard, ReportCard, EmptyState 등)
  - Zustand 인증 상태 + AuthGuard + `word-break: keep-all` + 반응형
- **Issue #9 — Celery Beat 주간 자동 리포트 (머지 완료)**
  - Celery + Redis 통합, Beat 스케줄 매주 월요일 09:00 KST
  - 활성 User 순회 → 직전 7일 PeriodReport 자동 생성 (중복 skip, 실패 격리)
  - docker-compose celery 서비스는 #12 (배포)로 이관
  - 5개 테스트
- **Issue #8 — 기간 학습 리포트 + 학습 로드맵 생성 (머지 완료)**
  - Node.js: `POST /api/reports` (생성) + `GET /api/reports` (목록) + `GET /api/reports/:id` (상세)
  - AI 서버: `POST /ai/generate-report` — Claude로 strengths/weaknesses/stats + roadmap 생성
  - 환경변수 `AI_API_URL` 추가 (Node.js → FastAPI 내부 호출)
  - 테스트 15종 (Node.js 10 + Python 5)
- **Issue #7 — 일일 학습 요약 자동 생성 + 조회 API (머지 완료)**
  - AI 서버: CommitAnalysis 저장 후 DailySummary upsert (Claude 통합 요약 + 태그 병합)
  - Node.js API: `GET /api/summaries/daily?date=` + `GET /api/summaries/daily/:id`
  - 빈 날짜: "오늘은 커밋 기록이 없습니다" (PRD §4)
  - 테스트 11종 (Node.js 8 + Python 3)
- **Issue #6 — FastAPI Kafka Consumer + Claude diff 분석 (머지 완료)**
  - aiokafka Consumer → GitHub diff 조회 → Claude 분석 → CommitAnalysis DB 저장
  - langchain 제거, anthropic SDK 직접 사용 ([ADR-011](decisions/ADR-011-ai-server-deps.md))
  - AES-256-GCM Python 포팅 (Node.js 암호화 호환), Python 3.9 호환 수정
  - 10개 자동화 테스트 (로컬 통과 확인)
  - 자세한 내용: [Dev Log](devlog/2026-04-12-issue-6-kafka-consumer-claude.md)
- **Issue #5 — GitHub Webhook 수신 → Kafka 발행 (머지 완료)**
  - `POST /api/webhooks/github` — push 이벤트 수신, HMAC SHA-256 서명 검증, Kafka 발행
  - fire-and-forget 패턴으로 즉시 200 응답 (Webhook 타임아웃 회피)
  - kafkajs 의존성 추가, Kafka Producer 싱글톤 모듈
  - 9개 자동화 테스트 (서명 누락/불일치, 미등록 레포, Kafka 실패 복원력, 빈 commits 등)
- **Issue #4 — 레포 연결 + GitHub Webhook 자동 등록 (머지 완료)**
  - `GET /api/repositories/github`, `GET/POST /api/repositories`, `DELETE /api/repositories/:id`
  - GitHub Webhook push 이벤트 자동 등록, webhook secret AES-256-GCM 암호화 저장
  - soft-delete 재연결 시 unique constraint 충돌 버그 발견·수정 (QA 단계)
  - 10개 자동화 테스트 (중복 409, 재연결 재활성화, Webhook 실패 복원력 등)
  - 자세한 내용: [Dev Log](devlog/2026-04-10-issue-4-repo-webhook.md)
- **Issue #3 — GitHub OAuth + JWT 세션 구현 (머지 완료)**
  - `/api/auth/github`, `/callback`, `/logout`, `/me` 엔드포인트
  - GitHub access_token AES-256-GCM 암호화 저장 (DB 덤프 노출 시에도 안전)
  - JWT 세션 — httpOnly 쿠키 + Authorization Bearer 동시 지원 (웹/MCP 양립)
  - state CSRF 보호, Hono 미들웨어, 30개 자동화 테스트 (보안 엣지 17 + 세션 동기화 1 포함)
  - Prisma 초기 마이그레이션 생성 (`20260409235734_init`)
  - **CI 강화:** `bunx prisma generate` 단계 추가 (모노레포에서 자동 실행 안 됨), `bun test --coverage` 도입
  - **세션 만료 동기화 fix:** PR 리뷰에서 발견 — `JWT_EXPIRES_IN`(문자열)과 `SESSION_COOKIE_MAX_AGE`(7일 하드코딩)가 분리되어 어긋날 수 있던 문제. `SESSION_MAX_AGE_SECONDS`(숫자) 단일 환경변수로 통합
  - 자세한 내용: [Dev Log](devlog/2026-04-10-issue-3-github-oauth-jwt.md), [ADR-010](decisions/ADR-010-auth-session-storage.md)
- Issue #1: 모노레포 구조 및 개발 환경 세팅 완료
  - 모노레포 (apps/web, api, ai, mcp) + bun 워크스페이스
  - Docker Compose (PostgreSQL 16, Redis 7, Kafka + Zookeeper)
  - Prisma 6 스키마 (5개 모델)
  - 린트/포맷터 (ESLint + Prettier, Ruff + Black)
  - Git 훅 (Husky + lint-staged + commitlint)
  - CI/CD (GitHub Actions)
- ADR: 10건 (ADR-010: 인증·세션 보관 설계 추가)

## 알려진 이슈

| 이슈                                     | 심각도 | 상태                       |
| ---------------------------------------- | ------ | -------------------------- |
| develop 기본 브랜치 설정 필요            | P1     | push 후 GitHub 웹에서 설정 |
| Branch protection rules 미설정           | P1     | push 후 GitHub 웹에서 설정 |
| JWT refresh token 없음 — 7일 후 재로그인 | P2     | MVP1 수용, v2에서 검토     |
| OAuth 키 로테이션 절차 미정의            | P2     | 운영(#12) 단계에서 결정    |
| README에 MCP 등록 방법 미문서화          | P2     | #12 배포 시 함께 작성      |

## 기술 부채

| 항목                                              | 등록일     | 예상 작업량          |
| ------------------------------------------------- | ---------- | -------------------- |
| Prisma 6 → 7 마이그레이션                         | 2026-04-07 | M                    |
| ~~deploy.yml 실제 배포 로직 구현~~                | 2026-04-07 | ~~M~~ (#12에서 해결) |
| `TOKEN_ENCRYPTION_KEY` AWS Secrets Manager로 이관 | 2026-04-10 | S (#12와 함께)       |

## 다음 계획

- [x] 모노레포 구조 생성 (web, api, ai, mcp)
- [x] DB 스키마 (Prisma)
- [x] 협업 환경 풀세팅 (린트, 훅, CI/CD)
- [x] GitHub OAuth 로그인 (#3, QA 승인)
- [x] 레포 연결 + Webhook 자동 등록 (#4, QA 승인)
- [x] Webhook 수신 → Kafka 발행 (#5, QA 승인)
- [x] FastAPI Kafka Consumer + Claude 분석 (#6, QA 승인)
- [x] 일일 학습 요약 (#7, QA 승인)
- [x] 기간 리포트 + 학습 로드맵 (#8, QA 승인)
- [x] Celery Beat 주간 자동 리포트 (#9, QA 승인)
- [x] 대시보드 UI (#10, QA 승인)
- [x] MCP 서버 (#11, QA 승인)
- [x] AWS 배포 (#12, QA 승인)
- [ ] AI 활용 리포트 + 최종 제출 (#13)

# 파이프라인 테스트 Mon Apr 13 19:21:00 KST 2026
