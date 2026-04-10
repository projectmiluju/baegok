# 개발 일지: Issue #3 — GitHub OAuth + JWT 세션 구현

**일자:** 2026-04-10
**관련 버전:** v0.1.0 (예정)
**관련 역할:** spec → build → qa → docs

## 배경 (Context)

PRD MVP1의 첫 기능 이슈. 배곡의 모든 후속 기능(레포 연결 #4, Webhook #5, AI 분석 #6 등)은
사용자를 식별하고 GitHub access_token을 들고 있어야 하므로, 인증/세션이 가장 먼저 와야 했다.

## 문제 (Problem)

구현 자체는 큰 막힘 없이 진행됐다. 진짜 문제는 **두 군데에서 발견됐다.**

### 문제 1 — DB 마이그레이션 환경이 없음

Issue #1에서 `apps/api/prisma/schema.prisma`는 작성되었지만, **마이그레이션 폴더가 비어있고 docker-compose.yml도 존재하지 않았다.**
즉, `bun run db:migrate`를 실행할 PostgreSQL 인스턴스 자체가 없었다. README는 "docker compose up -d"를 안내하지만, 실제로는 그 파일이 없다.

### 문제 2 — CI에 Prisma generate 단계 부재

OAuth 코드가 `lib/prisma.ts`를 거쳐 `@prisma/client`를 import하기 시작했는데, CI는 fresh checkout 후
`bun install` → `tsc --noEmit`만 실행할 뿐 `prisma generate`를 호출하지 않았다.
Prisma 모노레포에서는 install 후크가 schema.prisma를 자동 탐지하지 못해 클라이언트 .d.ts가 생성되지 않는다.
**기존 health.test.ts는 prisma를 건드리지 않아서 우연히 통과하던 것이고, #3 머지 즉시 CI는 깨지게 되어 있었다.**

## 시도한 것들 (Attempts)

1. **시도 1 (마이그레이션 환경):** docker-compose.yml을 같은 브랜치에 추가할까 검토 → 거절.
   - 이유: 이건 #1의 결손이지 #3의 책임이 아님. PR 스코프가 오염됨.
   - 임시 해결: `docker run -d --name baegok-postgres ... postgres:16`로 일회성 컨테이너 기동, `prisma migrate dev --name init` 실행, 마이그레이션 파일을 레포에 커밋.
   - 별도 fix 이슈로 docker-compose 작성을 후속 처리하기로 함.

2. **시도 2 (CI prisma generate):** 별도 PR로 분리할까 검토 → 같은 PR에 포함.
   - 이유: 이건 #3가 도입한 의존성 때문에 발생하는 결손이라, 인과관계상 같은 PR에 함께 들어가는 게 더 정직하다.
   - 적용: `.github/workflows/ci.yml`의 `lint-and-typecheck`, `test` 잡 양쪽에 `cd apps/api && bunx prisma generate` 단계를 install 직후에 추가.

3. **시도 3 (커버리지):** 같은 PR에 `bun test --coverage` CI 통합도 함께 추가.
   - 결과: api 90.48% funcs / 97.05% lines, 핵심 보안 코드(crypto, jwt, middleware, routes/auth)는 모두 100% 라인 커버리지.
   - 임계값 게이트는 의도적으로 두지 않음 — 메트릭 게임을 유도할 위험이 더 큼.

## 최종 해결 (Resolution)

- **인증 흐름**: GitHub OAuth → state CSRF 검증 → code 교환 → access_token 획득 → AES-256-GCM 암호화 → User upsert → JWT 발급 → httpOnly 쿠키. 자세한 결정 근거는 [ADR-010](../decisions/ADR-010-auth-session-storage.md).
- **미들웨어**: 쿠키와 `Authorization: Bearer` 양쪽 모두 허용하는 단일 미들웨어. 웹은 쿠키, MCP는 Bearer.
- **테스트**: 28개 자동화 테스트 (해피 패스 + 보안 엣지 케이스 17개 — AuthTag 변조, IV 손상, 만료 JWT, 다른 시크릿 서명, DB 사용자 누락 등).
- **CI 강화**: `bunx prisma generate` 단계를 typecheck와 test 잡 양쪽에 추가, `bun test --coverage`로 변경.

## 배운 것 (Lessons Learned)

1. **"기존 테스트가 통과한다"는 "CI가 안전하다"는 뜻이 아니다.**
   health.test.ts가 prisma를 안 건드렸기 때문에 CI는 통과하고 있었지만, prisma를 건드리는 첫 PR이 들어오는 순간 깨질 운명이었다. 새 의존성을 도입하는 PR은 **CI 단계가 그 의존성을 빌드할 수 있는지** 적극적으로 점검해야 한다.

2. **이슈 결손은 발견한 사람이 같은 PR에 묶지 말고 별도로 분리하라 — 인과관계가 같지 않다면.**
   docker-compose.yml은 #1의 결손이라 별도 fix 이슈로 분리. CI prisma generate는 #3가 도입한 의존성 때문에 생긴 결손이라 같은 PR에 포함. 두 케이스는 비슷해 보여도 책임 귀속이 다르다.

3. **bun:test의 mock.module은 transitive import도 가로챈다.**
   `routes/auth.ts`가 정적 import로 `@/lib/prisma`를 가져오지만, 테스트에서 `mock.module("@/lib/prisma", ...)`를 import 전에 호출하면 실제 PrismaClient는 로드되지 않는다. DB 없이 라우트 통합 테스트가 가능했던 핵심 트릭.

4. **MVP1에서 refresh token은 사치다.**
   JWT 만료 7일 후 재로그인은 1인 개발자 시점에 충분히 수용 가능. 사용자가 실제로 불편을 호소할 때 도입하면 된다.
