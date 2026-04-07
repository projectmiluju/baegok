# ADR-005: MCP 서버 직접 구현

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

배곡의 핵심 컨셉은 "수강생 레포에 MCP를 연결하여 자동 수집/조회"이다.
MCP 서버가 없으면 컨셉 자체가 성립하지 않는다.

## 고려한 선택지

### 선택지 A: MCP 없이 웹 대시보드만 제공
- 장점: 구현 공수 절감
- 단점: 배곡의 핵심 차별점 소실, 일반적인 대시보드와 차이 없음

### 선택지 B: TypeScript MCP SDK로 직접 구현
- 장점: Cursor/Claude Code/Gemini CLI 등 IDE에서 직접 조회 가능, 차별점 확보
- 단점: 추가 서비스 1개, 클라이언트별 설정 문서화 필요

## 결정 (Decision)

**선택지 B: TypeScript MCP SDK로 직접 구현.**
TypeScript MCP SDK는 문서화가 잘 되어 있어 구현 공수가 적다.
stdio transport로 Cursor, Claude Code, Gemini CLI 모두 지원.
공모전 심사 기준 "창의성 및 확장성"에 직접 어필 가능.

## 결과 (Consequences)

- 긍정적: 핵심 차별점 확보, 공모전 심사 "창의성" 어필
- 부정적: Docker Compose 서비스 1개 추가
- 리스크: MCP 프로토콜 자체가 아직 초기 단계

## 되돌릴 조건 (Reversal Triggers)

- MCP 프로토콜이 deprecate되면 REST API 또는 LSP로 전환
