# ADR-011: AI 서버 의존성 정리 (langchain 제거, aiokafka 교체)

**일자:** 2026-04-12
**상태:** Accepted

## 맥락 (Context)

Issue #6에서 FastAPI Kafka Consumer + Claude 분석을 구현하면서 기존 `requirements.txt`의
의존성 구성을 재검토했다. #1에서 초기 세팅 시 `langchain`, `langchain-anthropic`,
`kafka-python-ng`가 포함되어 있었지만, 실제 구현에서 이들이 적합한지 판단이 필요했다.

## 고려한 선택지

### 1. Claude API 호출 방식

#### 선택지 A: LangChain + langchain-anthropic

- 장점: chain/agent 패턴, 프롬프트 템플릿, 메모리 등 고수준 추상화
- 단점: 이 프로젝트에서 chain/agent/memory 기능을 전혀 안 씀. 단일 메시지 → 단일 JSON 응답이 전부. 의존성 3개 추가(langchain, langchain-core, langchain-anthropic)로 설치 시간과 번들 크기만 증가. 버전 충돌 위험.

#### 선택지 B: anthropic SDK 직접 사용 (채택)

- 장점: 의존성 1개. API 호출 코드가 10줄. 응답 파싱이 명확. 에러 핸들링이 투명.
- 단점: chain 패턴이 필요해지면 직접 구현해야 함 — 현재 필요 없음.

### 2. Kafka 라이브러리

#### 선택지 X: kafka-python-ng (기존)

- 장점: 설치 간단, 동기 API
- 단점: asyncio 미지원. FastAPI lifespan 안에서 background task로 돌리려면 별도 스레드 필요. 복잡도 증가.

#### 선택지 Y: aiokafka (채택)

- 장점: asyncio 네이티브. FastAPI lifespan + `asyncio.create_task`로 자연스럽게 통합. `async for msg in consumer` 패턴.
- 단점: kafka-python-ng보다 사용자 수 적음 — 하지만 충분히 성숙하고 aiokafka 자체가 kafka-python fork.

## 결정 (Decision)

1. **langchain, langchain-anthropic 제거** → anthropic SDK 직접 사용
2. **kafka-python-ng 제거** → aiokafka 교체
3. **pydantic-settings, cryptography, pytest, pytest-asyncio 추가** (환경변수 검증, AES-256-GCM 복호화, 테스트)

## 결과 (Consequences)

- **긍정적:** 의존성 5개 제거 → 2개 추가. 설치 시간 단축. Claude API 호출이 10줄로 명확. Kafka Consumer가 asyncio로 자연스러움.
- **부정적:** LangChain의 고수준 기능(agent, RAG 등)이 필요해지면 다시 추가해야 함. 현재는 그런 요구 없음.
- **리스크:** 없음. anthropic SDK가 LangChain보다 안정적이고 직접 관리됨.

## 되돌릴 조건 (Reversal Triggers)

- RAG(벡터 검색) 기능이 도입되어 LangChain의 chain 패턴이 실익을 가질 때 (PRD v3 pgvector 도입 시점)
- 동시에 여러 Kafka 토픽을 구독해야 해서 aiokafka의 단일 consumer 패턴이 부족할 때
