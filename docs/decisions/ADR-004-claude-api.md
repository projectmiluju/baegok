# ADR-004: Claude API 직접 호출 (Fine-tuning 없이)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

커밋 diff 분석, 학습 요약, 로드맵 생성에 LLM이 필요하다.
LLaMA 3 + LoRA Fine-tuning도 고려했으나,
배곡은 D-6 제약이 있다.

## 고려한 선택지

### 선택지 A: LLaMA 3 Fine-tuning
- 장점: 오픈소스, 비용 없음, 맞춤형 모델
- 단점: 학습 데이터 없음, 세팅 공수 2~3일, GPU 필요

### 선택지 B: Claude API 직접 호출
- 장점: 즉시 사용 가능, 프롬프트 엔지니어링으로 품질 확보, 공모전 "AI 활용 능력" 심사에 직접 어필
- 단점: API 비용 발생, 외부 의존

## 결정 (Decision)

**선택지 B: Claude API 직접 호출.**
D-6에 Fine-tuning 파이프라인을 구축할 시간이 없고, 학습 데이터도 없다.
프롬프트 전략을 정교하게 설계하면 커밋 분석 품질은 충분하다.
공모전 심사 기준 "AI 활용 능력 — 프롬프트 전략"에 직접 어필 가능.

## 결과 (Consequences)

- 긍정적: 즉시 구현 가능, 프롬프트 전략 자체가 포트폴리오
- 부정적: API 호출 비용, Anthropic 서비스 의존
- 리스크: API 장애 시 분석 불가 (예외 처리로 대응)

## 되돌릴 조건 (Reversal Triggers)

- 사용자 규모가 커져 API 비용이 부담되면 Fine-tuning 또는 오픈소스 모델 전환
