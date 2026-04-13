# ADR-010: 인증·세션 보관 설계 (JWT in cookie + AES-256-GCM token storage)

**일자:** 2026-04-10
**상태:** Accepted

## 맥락 (Context)

Issue #3에서 GitHub OAuth + JWT 세션을 구현하면서 두 가지 보관(저장) 결정을 내려야 했다.

1. **세션 토큰(JWT)을 클라이언트에 어떻게 전달/저장할 것인가?**
2. **GitHub access_token을 DB에 어떻게 저장할 것인가?**

GitHub access_token은 후속 이슈(#4 레포 연결, #5 Webhook 등록, #6 diff 조회)에서
서버 측 작업에 그대로 사용해야 하므로 **평문 그대로 들고 다닐 수는 없지만 복호화 가능해야** 한다 — 단방향 해시는 쓸 수 없다.

## 고려한 선택지

### 1. JWT 전달 방식

#### 선택지 A: httpOnly 쿠키

- 장점: XSS로 토큰 탈취 불가, 브라우저가 자동 전송, 프론트엔드 코드에 토큰 노출 없음
- 단점: CSRF 방어 별도 필요(`SameSite=Lax`로 완화), 모바일 네이티브 클라이언트와 궁합 약함

#### 선택지 B: redirect 쿼리스트링 → localStorage

- 장점: 모바일/MCP 친화, 헤더 기반 클라이언트와 호환
- 단점: XSS 1건만 발생해도 토큰 전부 유출, OAuth 콜백 URL이 토큰을 노출

#### 선택지 C: 두 가지 모두 지원

- 장점: 브라우저는 쿠키, MCP·모바일·CLI는 Bearer로 — 케이스별 최적
- 단점: 미들웨어가 두 경로 다 처리해야 함 (실제론 ~10줄 추가)

### 2. access_token 저장 방식

#### 선택지 X: 평문 저장

- 장점: 단순
- 단점: DB 덤프 한 번에 모든 사용자의 GitHub 토큰 유출 — 1인 프로젝트라도 절대 불가

#### 선택지 Y: AES-256-GCM 대칭 암호화

- 장점: 인증 암호(authenticated encryption)로 변조까지 탐지, Node 빌트인 `crypto`만 사용, 키 1개 관리
- 단점: 키 유출 시 전부 유출 — 키는 환경변수로 관리하고 운영에서는 시크릿 매니저에 위임

#### 선택지 Z: KMS(envelope encryption)

- 장점: 키 자체가 KMS에 갇힘
- 단점: AWS 의존, 로컬 개발 복잡도 증가, MVP1 시점에 과도

## 결정 (Decision)

1. **JWT 전달:** **선택지 C (httpOnly 쿠키 + Authorization Bearer 동시 지원)**
   - 웹 대시보드(#10)는 쿠키로 자동 처리 → 프론트엔드 코드에 토큰 한 줄도 안 들어감
   - MCP 서버(#11)는 환경변수에 JWT를 넣고 Bearer 헤더로 호출 → IDE 환경에서 쿠키 jar 없이 동작
   - 미들웨어 추가 비용은 ~10줄, 두 클라이언트 유형을 동시에 만족시키므로 가치가 있음

2. **access_token 저장:** **선택지 Y (AES-256-GCM, `iv:authTag:ciphertext` hex 형식)**
   - 인증 암호이므로 변조 시 복호화 단계에서 즉시 탐지됨
   - IV는 매 호출마다 새로 생성(96비트 권장값) → 동일 평문도 다른 암호문 → 패턴 분석 방지
   - 키는 `TOKEN_ENCRYPTION_KEY` 환경변수(64자 hex), 운영에서는 AWS Secrets Manager로 이관 (#12)
   - DB 컬럼 타입은 그대로 `String` 유지 — 형식이 단순 hex 문자열이라 마이그레이션 비용 0

## 부가 결정 — 세션 만료 단일 소스 (PR #14 리뷰 후 추가)

초안 구현에서 `JWT_EXPIRES_IN`(문자열, 환경변수)과 `SESSION_COOKIE_MAX_AGE`(7일 하드코딩 상수)가 독립적이었다. 두 값이 어긋나면:

- JWT가 더 짧으면 → 쿠키는 살아있는데 토큰만 만료 → 영구 401
- 쿠키가 더 짧으면 → 사용자는 로그아웃됐다고 느끼지만 Bearer 토큰은 살아있음

→ **두 값을 `SESSION_MAX_AGE_SECONDS`(숫자, 초 단위) 단일 환경변수에서 파생시켜 어긋남 자체를 봉쇄.** `jsonwebtoken`은 `expiresIn: number` 형식을 지원하므로 새 의존성 0개. 동기화 검증 테스트로 회귀 차단.

원칙으로 고정: **시간에 관한 값은 단일 소스에서 파생시킨다.** 같은 의미를 두 곳에 적는 것은 곧 버그.

## 결과 (Consequences)

- **긍정적:**
  - 웹 클라이언트에서는 토큰이 JS 영역에 한 번도 노출되지 않음 (XSS 저항성)
  - 헤더 기반 클라이언트(MCP)도 동일 미들웨어로 동작 — 코드 중복 0
  - DB 덤프가 유출되어도 GitHub 토큰은 추가 키 없이는 복호화 불가
  - 모든 암호화/복호화 로직이 `apps/api/src/lib/crypto.ts` 한 파일에 격리됨
  - 세션 만료가 한 곳(`SESSION_MAX_AGE_SECONDS`)에서만 결정됨 — 어긋남 가능성 0

- **부정적:**
  - CSRF는 별도 방어가 필요 — `SameSite=Lax`로 1차 방어, state 파라미터로 OAuth 콜백 보호
  - `TOKEN_ENCRYPTION_KEY`가 .env에 있고 분실 시 모든 사용자 재로그인 필요(서비스 중단 아님, 다음 OAuth flow에서 자동 갱신)
  - 키 로테이션 절차가 별도로 필요(현재 미구현 — 운영 단계 결정 사항)

- **리스크:**
  - JWT 만료(7일) 후 refresh token 없음 — 사용자는 재로그인 필요. MVP1에서는 수용. v2에서 refresh token 도입 검토.

## 되돌릴 조건 (Reversal Triggers)

- 사용자 수가 10K+가 되어 KMS 도입의 운영 비용이 정당화될 때 → AES-256-GCM에서 KMS envelope encryption으로 전환
- 모바일 네이티브 앱이 추가되어 쿠키 jar 관리가 부담될 때 → Bearer 헤더 단일 방식으로 통일
- JWT 만료 7일이 사용자 불편으로 보고될 때 → refresh token 도입
