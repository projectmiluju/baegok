# 프로젝트 현황

**최종 업데이트:** 2026-04-10
**현재 버전:** v0.1.0 (예정 — Issue #3 머지 시점)
**배포 URL:** 미정

## 최근 변경

- **Issue #4 — 레포 연결 + GitHub Webhook 자동 등록 (QA 승인)**
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

## 기술 부채

| 항목                                              | 등록일     | 예상 작업량    |
| ------------------------------------------------- | ---------- | -------------- |
| Prisma 6 → 7 마이그레이션                         | 2026-04-07 | M              |
| deploy.yml 실제 배포 로직 구현                    | 2026-04-07 | M              |
| `TOKEN_ENCRYPTION_KEY` AWS Secrets Manager로 이관 | 2026-04-10 | S (#12와 함께) |

## 다음 계획

- [x] 모노레포 구조 생성 (web, api, ai, mcp)
- [x] DB 스키마 (Prisma)
- [x] 협업 환경 풀세팅 (린트, 훅, CI/CD)
- [x] GitHub OAuth 로그인 (#3, QA 승인)
- [x] 레포 연결 + Webhook 자동 등록 (#4, QA 승인)
- [ ] Webhook 수신 → Kafka 발행 (#5)
- [ ] FastAPI Kafka Consumer + Claude 분석 (#6)
- [ ] 일일 요약 / 기간 리포트 / 로드맵 API (#7~#9)
- [ ] 대시보드 UI (#10)
- [ ] MCP 서버 (#11)
- [ ] AWS 배포 (#12)
- [ ] AI 활용 리포트 + 최종 제출 (#13)
