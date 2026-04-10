# 개발 일지: Issue #3 — GitHub OAuth + JWT 세션 구현

**일자:** 2026-04-10
**관련 버전:** v0.1.0 (예정)
**관련 역할:** spec → build → qa → docs

## 배경 (Context)

PRD MVP1의 첫 기능 이슈. 배곡의 모든 후속 기능(레포 연결 #4, Webhook #5, AI 분석 #6 등)은
사용자를 식별하고 GitHub access_token을 들고 있어야 하므로, 인증/세션이 가장 먼저 와야 했다.

## 문제 (Problem)

구현 자체는 큰 막힘 없이 진행됐다. 진짜 문제는 **세 군데에서 발견됐다.** (마지막 한 건은 PR 리뷰에서 잡혔다.)

### 문제 1 — Prisma 초기 마이그레이션 폴더가 비어 있음

Issue #1에서 `apps/api/prisma/schema.prisma`는 작성되었지만, **마이그레이션 폴더는 비어 있었다.** `db:migrate`가 한 번도 실행된 적이 없었던 것이다. `docker-compose.yml`은 레포 루트에 존재했지만(처음에 잘못 찾아 "없다"고 단정한 게 시야 좁힘 사례 — 아래 "배운 것" 참조), 실제로 컴포즈를 띄우고 `prisma migrate dev`를 실행하는 절차가 누락된 상태였다.

### 문제 2 — CI에 Prisma generate 단계 부재

OAuth 코드가 `lib/prisma.ts`를 거쳐 `@prisma/client`를 import하기 시작했는데, CI는 fresh checkout 후
`bun install` → `tsc --noEmit`만 실행할 뿐 `prisma generate`를 호출하지 않았다.
Prisma 모노레포에서는 install 후크가 schema.prisma를 자동 탐지하지 못해 클라이언트 .d.ts가 생성되지 않는다.
**기존 health.test.ts는 prisma를 건드리지 않아서 우연히 통과하던 것이고, #3 머지 즉시 CI는 깨지게 되어 있었다.**

### 문제 3 — JWT 만료와 쿠키 max-age가 분리되어 있음 (PR 리뷰에서 발견)

초안 구현에서 `JWT_EXPIRES_IN`(문자열, 환경변수, 기본 `7d`)과 `SESSION_COOKIE_MAX_AGE`(상수, `7 * 24 * 60 * 60`)가 **독립적인 두 출처**였다. 운영자가 `JWT_EXPIRES_IN`을 `1h`나 `30d`로 바꾸면 쿠키는 여전히 7일이라 어긋나고, 사용자가 영구 401을 받거나 반대로 쿠키 만료 후에도 토큰만 살아있는 식으로 UX가 깨질 수 있었다.

## 시도한 것들 (Attempts)

1. **시도 1 (마이그레이션 환경):** `docker compose up -d`로 컨테이너 띄운 뒤 `prisma migrate dev --name init`을 실행해 첫 마이그레이션 파일을 만들고 레포에 커밋. (처음에는 docker-compose.yml이 없다고 잘못 판단해 `docker run` 임시 컨테이너로 우회했다가, PR 리뷰에서 파일이 실제로 존재한다는 것을 확인하고 절차를 정정함.)

2. **시도 2 (CI prisma generate):** 별도 PR로 분리할까 검토 → 같은 PR에 포함.
   - 이유: 이건 #3가 도입한 의존성 때문에 발생하는 결손이라, 인과관계상 같은 PR에 함께 들어가는 게 더 정직하다.
   - 적용: `.github/workflows/ci.yml`의 `lint-and-typecheck`, `test` 잡 양쪽에 `cd apps/api && bunx prisma generate` 단계를 install 직후에 추가.

3. **시도 3 (커버리지):** 같은 PR에 `bun test --coverage` CI 통합도 함께 추가.
   - 결과: api 90.48% funcs / 97.05% lines, 핵심 보안 코드(crypto, jwt, middleware, routes/auth)는 모두 100% 라인 커버리지.
   - 임계값 게이트는 의도적으로 두지 않음 — 메트릭 게임을 유도할 위험이 더 큼.

4. **시도 4 (세션 만료 동기화 — PR 리뷰 후 추가):** `JWT_EXPIRES_IN` 환경변수와 `SESSION_COOKIE_MAX_AGE` 상수 두 출처를 `SESSION_MAX_AGE_SECONDS`(숫자, 초 단위) 단일 환경변수로 통합. `jsonwebtoken`이 `expiresIn: number` 형식을 지원하므로 새 의존성 0개로 처리. 동기화 검증 테스트 1종 추가 (콜백 응답에서 `Set-Cookie`의 `Max-Age`와 JWT의 `exp - iat`가 같은지).

## 최종 해결 (Resolution)

- **인증 흐름**: GitHub OAuth → state CSRF 검증 → code 교환 → access_token 획득 → AES-256-GCM 암호화 → User upsert → JWT 발급 → httpOnly 쿠키. 자세한 결정 근거는 [ADR-010](../decisions/ADR-010-auth-session-storage.md).
- **미들웨어**: 쿠키와 `Authorization: Bearer` 양쪽 모두 허용하는 단일 미들웨어. 웹은 쿠키, MCP는 Bearer.
- **테스트**: 30개 자동화 테스트 (해피 패스 11 + 보안 엣지 17 + 세션 동기화 1 + 헬스체크 1 — AuthTag/IV/Ciphertext 변조, 만료 JWT, 다른 시크릿 서명, DB 사용자 누락 등).
- **CI 강화**: `bunx prisma generate` 단계를 typecheck와 test 잡 양쪽에 추가, `bun test --coverage`로 변경.
- **세션 만료 단일 소스화**: `SESSION_MAX_AGE_SECONDS`(기본 604800)가 JWT `expiresIn`과 쿠키 `max-age` 모두에 사용됨.

## 배운 것 (Lessons Learned)

1. **"기존 테스트가 통과한다"는 "CI가 안전하다"는 뜻이 아니다.**
   health.test.ts가 prisma를 안 건드렸기 때문에 CI는 통과하고 있었지만, prisma를 건드리는 첫 PR이 들어오는 순간 깨질 운명이었다. 새 의존성을 도입하는 PR은 **CI 단계가 그 의존성을 빌드할 수 있는지** 적극적으로 점검해야 한다.

2. **파일이 없다고 단정하기 전에 두 번 확인하라.**
   초기 탐색에서 `docker-compose.yml`이 없다고 잘못 판단하여 README/STATUS/devlog에 거짓 서술을 넣었다. PR 리뷰(Copilot)가 잡아주지 않았다면 develop에 거짓 정보가 그대로 들어갔을 것. **Glob 패턴 한 번 실패가 잘못된 전제를 만든다 — 다른 도구(`git ls-files`, `ls -la`)로 교차 검증해야 한다.**

3. **bun:test의 mock.module은 transitive import도 가로챈다.**
   `routes/auth.ts`가 정적 import로 `@/lib/prisma`를 가져오지만, 테스트에서 `mock.module("@/lib/prisma", ...)`를 import 전에 호출하면 실제 PrismaClient는 로드되지 않는다. DB 없이 라우트 통합 테스트가 가능했던 핵심 트릭.

4. **두 출처는 곧 두 진실이고, 두 진실은 곧 버그다.**
   JWT 만료와 쿠키 max-age가 분리된 환경변수/상수에서 나오면 운영자가 한쪽만 바꿨을 때 두 값이 어긋난다. **시간에 관한 값은 단일 소스에서 파생시켜야 한다.** 이걸 놓쳤다가 PR 리뷰에서 잡혔다.

5. **MVP1에서 refresh token은 사치다.**
   JWT 만료 7일 후 재로그인은 1인 개발자 시점에 충분히 수용 가능. 사용자가 실제로 불편을 호소할 때 도입하면 된다.
