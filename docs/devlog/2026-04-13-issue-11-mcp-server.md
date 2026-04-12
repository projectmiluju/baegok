# 개발 일지: MCP 서버 4개 도구 구현 (#11)

**일자:** 2026-04-13
**관련 버전:** v0.1.0 (예정)
**관련 역할:** build, qa

## 배경 (Context)

IDE(Cursor, VS Code 등)에서 배곡의 학습 데이터를 직접 조회할 수 있도록
MCP(Model Context Protocol) 서버에 도구를 등록하는 작업.
`@modelcontextprotocol/sdk`와 stdio 트랜스포트는 #1에서 이미 세팅되어 있었고,
실제 도구 로직만 추가하면 되는 상황이었다.

## 문제 (Problem)

**API 응답 엔벨로프 미언랩 — 프로젝트 전체에서 3번째 반복된 패턴.**

초기 구현에서 `apiCall<DailySummary>(...)` 형태로 API 응답을 직접 타입 캐스팅했으나,
실제 API는 모든 응답을 엔벨로프로 감싸고 있었다:

- `GET /api/summaries/daily` → `{ summary: {...} }`
- `POST /api/reports` → `{ report: {...} }`
- `GET /api/reports/:id` → `{ report: {...} }`

이로 인해 모든 도구에서 `data.date`, `data.summary` 등이 undefined가 되는 P0 버그 5건 발생.

추가로, AI 서버가 roadmap JSON을 snake_case(`recommended_topics`, `next_steps`)로 저장하고
DB에 그대로 들어가므로 API 응답도 snake_case인데, 프론트엔드 타입(`ReportRoadmap`)은
camelCase(`recommendedTopics`, `nextSteps`)를 기대하고 있어 런타임 TypeError 발생.

## 시도한 것들 (Attempts)

1. **시도 1: 직접 타입 캐스팅** — `apiCall<DailySummary>(...)`. 타입 시스템은 통과하지만
   런타임에서 실제 JSON 구조와 불일치. Copilot PR 리뷰에서 발견.
2. **시도 2: 엔벨로프 타입 정의 + 디스트럭처링** — 각 도구마다 `DailySummaryResponse`,
   `ReportResponse` 등 래퍼 인터페이스를 정의하고 `const { summary } = await apiCall<...>()`
   패턴으로 언랩. 성공.

## 최종 해결 (Resolution)

- MCP 4개 도구 모두 엔벨로프 래퍼 타입 정의 + 디스트럭처링으로 수정
- 프론트엔드 `ReportRoadmap` 인터페이스를 snake_case 키로 변경 + `?? []` 방어 코드 추가
- 추가 P1 수정: 날짜 regex 검증, days 범위 제한(1~30), 에러 바디 파싱 개선, version 일치

## 배운 것 (Lessons Learned)

이 프로젝트에서 API 응답 엔벨로프 불일치는 **3번째 반복 패턴**이다:

1. #10 대시보드 UI — 15건의 프론트-백엔드 정합성 이슈
2. #11 MCP 서버 — P0 5건
3. #11 프론트엔드 roadmap — snake_case vs camelCase

**근본 원인:** API 응답 스키마가 코드로 공유되지 않고, 각 클라이언트(web, mcp)가
독립적으로 타입을 정의하기 때문에 불일치가 반복된다.

**향후 대응:** API 응답 타입을 패키지로 공유하거나, OpenAPI 스키마 자동 생성을 검토할 만하다.
다만 MVP 단계에서는 비용 대비 효과가 낮으므로, PR 리뷰 + 테스트로 방어하는 현재 방식을 유지한다.
v2에서 클라이언트가 추가되면(예: 모바일) 그때 스키마 공유가 필수가 된다.
