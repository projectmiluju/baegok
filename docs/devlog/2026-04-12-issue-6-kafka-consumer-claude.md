# 개발 일지: Issue #6 — FastAPI Kafka Consumer + Claude 분석

**일자:** 2026-04-12
**관련 버전:** v0.1.0 (예정)
**관련 역할:** build → qa

## 배경 (Context)

#5에서 Node.js API가 Kafka에 발행한 커밋 메시지를 받아 AI 분석을 수행하는 파이프라인의
핵심 부분. 이 이슈로 배곡의 가치 제안("push하면 자동 분석")이 실제로 동작하기 시작한다.

## 문제 (Problem)

### 문제 1 — Python 3.11 문법으로 작성했는데 로컬이 3.9

초기 구현에서 `datetime.UTC`(3.11+), `str | None`(3.10+), `dict[str, ...]`(3.9+이지만
런타임 평가 시 실패) 등 3.11 전용 문법을 사용했다. CI는 3.11이라 통과하겠지만
**로컬에서 테스트를 못 돌리면 개발 피드백 루프가 "push → CI → 실패 → fix"로 늘어난다.**

QA 단계에서 사용자가 "로컬에서 안 되면 고쳐야 하는 거 아니야?"라고 정확히 지적.

### 문제 2 — Node.js access_token 복호화를 Python에서 해야 함

Kafka Consumer가 커밋 분석을 위해 GitHub diff를 조회하려면 사용자의 access_token이 필요하다.
이 토큰은 Node.js API에서 AES-256-GCM으로 암호화되어 DB에 저장되어 있다.
Python에서 같은 키로 복호화해야 하므로 **크로스 플랫폼 암호화 호환성**이 필요했다.

## 시도한 것들 (Attempts)

1. **시도 1 (3.11 문법 유지 + CI 의존):** "CI에서 3.11로 테스트하면 된다"고 판단.
   → QA에서 거절. **로컬 테스트 실행 불가는 개발 효율 저하.** 올바른 지적.

2. **시도 2 (`from __future__ import annotations` 적용):** Python 3.7+에서 3.10+ 문법을
   어노테이션으로 사용 가능하게 하는 표준 방법. `str | None`, `dict[str, ...]` 등이
   런타임이 아닌 어노테이션으로만 평가되어 3.9에서도 동작.
   - 예외: SQLAlchemy `Mapped[]`는 런타임에서 `eval()`로 어노테이션을 평가하므로
     `Optional[str]` 형태를 유지해야 함 → pyproject.toml에 `UP045` 무시 추가.
   - `datetime.UTC` → `timezone.utc` (3.9 호환)
   - `datetime.fromisoformat("...Z")` → `.replace("Z", "+00:00")` (3.9에서 Z 지원 안 함)

3. **시도 3 (AES-256-GCM Python 포팅):** `cryptography` 라이브러리의 `AESGCM` 클래스 사용.
   Node.js 형식 `iv:authTag:ciphertext`에서 Python은 `aesgcm.decrypt(iv, ciphertext + authTag, None)`으로
   합쳐서 넘겨야 함 — GCM 표준 동작. associated_data는 Node.js도 None(미사용)이라 일치.

## 최종 해결 (Resolution)

- `from __future__ import annotations`를 모든 Python 파일에 적용 → 3.9 호환 + 3.11 문법 유지
- SQLAlchemy Mapped[] 타입만 `Optional[str]` 유지 (런타임 eval 제약)
- AES-256-GCM 복호화는 `cryptography` AESGCM으로 구현, `ciphertext + authTag` 합성
- 로컬 테스트 10/10 통과 확인 (Python 3.8 + pytest)

## 배운 것 (Lessons Learned)

1. **"CI에서 되면 된다"는 핑계다.** 로컬 테스트가 안 되면 피드백 루프가 느려지고,
   그 느린 루프가 반복되면 "테스트 안 돌리고 push" 습관이 생긴다. 로컬 실행 가능성은 협상 불가.

2. **`from __future__ import annotations`는 3.7+에서 최신 타입 힌트를 쓰는 가장 깔끔한 방법이다.**
   단, ORM(SQLAlchemy)처럼 런타임에 어노테이션을 평가하는 라이브러리는 예외 — 이건 per-file-ignores로 관리.

3. **크로스 플랫폼 암호화는 형식 명세가 전부다.** Node.js의 `iv:tag:ciphertext` 형식만 정확히
   알면 Python 포팅은 5줄 — 복잡한 건 형식을 모르는 것이지 구현이 아니다. ADR-010에 형식을
   명시해둔 게 여기서 빛났다.
