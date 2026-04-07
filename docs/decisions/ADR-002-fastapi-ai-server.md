# ADR-002: FastAPI AI 전용 서버

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

커밋 diff 분석, 학습 요약, 로드맵 생성 등 AI 로직을 어디에 배치할지 결정이 필요했다.

## 고려한 선택지

### 선택지 A: Node.js API에 통합
- 장점: 서버 1개로 단순화, 배포 포인트 감소
- 단점: Python AI 라이브러리(LangChain, Celery) 사용 불가, AI 로직과 CRUD 혼재

### 선택지 B: FastAPI 독립 서버
- 장점: Python AI 생태계(LangChain, Celery, Beat) 전부 활용 가능, AI 로직 독립
- 단점: 서비스 간 통신 필요, 배포 포인트 증가

## 결정 (Decision)

**선택지 B: FastAPI 독립 서버.**
AI 분석은 Python 생태계의 이점이 압도적이다.
Kafka를 통한 비동기 통신으로 서비스 간 결합도를 낮춘다.
외부에 노출하지 않고 내부 Kafka Consumer + 내부 API로만 운영한다.

## 결과 (Consequences)

- 긍정적: LangChain, Celery Beat 등 Python AI 도구 전부 사용 가능, 역할 명확
- 부정적: Docker Compose 서비스 1개 추가, 내부 API 통신 설계 필요
- 리스크: Python-Node.js 간 데이터 포맷 불일치 가능성 (Zod/Pydantic으로 방어)

## 되돌릴 조건 (Reversal Triggers)

- AI 로직이 단순 API 호출 수준으로 축소되면 Node.js에 통합 검토
