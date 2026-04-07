# ADR-001: Node.js 메인 백엔드 (Hono)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

배곡은 프론트엔드(Next.js), AI 서버(FastAPI), MCP 서버(TypeScript)로 구성된다.
메인 백엔드를 어떤 언어/프레임워크로 구현할지 결정이 필요했다.

## 고려한 선택지

### 선택지 A: Kotlin + Spring Boot
- 장점: 엔터프라이즈 수준의 성숙도, Java 경험 기반 진입 장벽 낮음
- 단점: 프론트(TS) + MCP(TS)와 타입 공유 불가, JVM 부팅 시간, D-6에 세팅 공수 큼

### 선택지 B: FastAPI에 통합 (AI + API 하나로)
- 장점: 서버 1개로 단순화
- 단점: Python으로 일반 웹 API를 짜는 건 비효율적, OAuth/CRUD는 Node.js가 자연스러움

### 선택지 C: Node.js + Hono (TypeScript)
- 장점: 프론트/MCP와 TypeScript 통일로 DTO/인터페이스 공유, 경량, Web Standard API 기반
- 단점: Hono는 Express 대비 생태계가 작음

## 결정 (Decision)

**선택지 C: Node.js + Hono.**
프론트엔드, MCP 서버와 TypeScript를 공유하여 타입 일관성을 확보한다.
FastAPI는 AI 분석 전용으로 분리하여 역할을 명확히 한다.

## 결과 (Consequences)

- 긍정적: 3개 서비스(web, api, mcp)가 TypeScript로 통일, 타입/인터페이스 공유 가능
- 부정적: Hono 미들웨어 생태계가 Express보다 적어 일부 직접 구현 필요
- 리스크: Hono의 프로덕션 레퍼런스가 Express 대비 적음

## 되돌릴 조건 (Reversal Triggers)

- Hono에서 해결 불가능한 미들웨어 이슈가 발생하면 Express로 전환 (API 호환 가능)
