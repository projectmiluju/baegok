# ADR-003: Kafka 비동기 처리

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

GitHub Webhook push 이벤트를 받으면 Claude API로 커밋 diff를 분석해야 한다.
이 분석은 수 초~수십 초가 걸린다.
GitHub Webhook은 10초 타임아웃이 있으며, 응답이 없으면 재전송한다.

## 고려한 선택지

### 선택지 A: 동기 처리 (Webhook → 즉시 AI 분석)
- 장점: 구현 단순
- 단점: GitHub Webhook 타임아웃, 동시 push 시 서버 부하, 실패 시 유실

### 선택지 B: Kafka 비동기 처리
- 장점: Webhook 즉시 202 응답, Consumer가 순차 처리, 실패 시 메시지 큐에 남아 재처리
- 단점: Kafka + Zookeeper 인프라 추가, EC2 메모리 사용량 증가

## 결정 (Decision)

**선택지 B: Kafka 비동기 처리.**
Webhook 수신 → 즉시 202 응답 → Kafka `commit-analysis` 토픽에 메시지 발행 →
FastAPI Consumer가 비동기로 분석.

## 결과 (Consequences)

- 긍정적: Webhook 타임아웃 해소, 실패 복구 가능, 부하 분산
- 부정적: Docker Compose에 Kafka + Zookeeper 추가, EC2 t3.medium 이상 필요
- 리스크: 1인 MVP 규모에서 Kafka는 과잉일 수 있으나, 안정성 확보가 우선

## 되돌릴 조건 (Reversal Triggers)

- EC2 비용이 부담되고 동시 사용자가 극소수라면 BackgroundTasks(FastAPI)로 대체 검토
