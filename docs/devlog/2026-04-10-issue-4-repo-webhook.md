# 개발 일지: Issue #4 — 레포 연결 + GitHub Webhook 자동 등록

**일자:** 2026-04-10
**관련 버전:** v0.1.0 (예정)
**관련 역할:** build → qa

## 배경 (Context)

#3 OAuth/JWT 완료 후 다음 단계. 사용자가 추적할 GitHub 레포를 선택하면
push 이벤트 Webhook을 자동 등록하여 #5(Webhook 수신 → Kafka)로 이어지는 파이프라인의 입구.

## 문제 (Problem)

### Soft-delete 후 재연결 시 unique constraint 충돌

QA 단계에서 발견. `@@unique([userId, githubRepoId])` 제약이 soft-deleted 행에도 적용되므로:

1. 사용자가 레포 A 연결 (행 생성)
2. 레포 A 해제 (soft delete — `deletedAt` 설정, 행은 DB에 존재)
3. 레포 A 재연결 시도 → 중복 확인이 `deletedAt: null`만 보니 "중복 아님" → `prisma.create` → unique 위반 → **500**

이건 "soft delete 쓰면서 unique 제약도 거는" 패턴에서 자주 나오는 함정이다.

## 시도한 것들 (Attempts)

1. **unique 제약에 deletedAt 포함:** Prisma가 `@@unique([userId, githubRepoId, deletedAt])` 형태를 지원하긴 하지만, NULL 비교가 DB마다 달라서 PostgreSQL에서도 동일 값 NULL 2개가 다른 행으로 취급됨. 적용하면 soft-deleted 행이 여러 개 쌓임 → 스키마 변경 없이 해결하는 게 안전.

2. **재활성화 분기 (채택):** POST 핸들러에서 soft-deleted 행이 있으면 `update`로 재활성화(deletedAt=null, isActive=true, 새 webhookId/secret). unique 제약 건드리지 않고 해결.

## 최종 해결 (Resolution)

`routes/repositories.ts` POST 핸들러에 soft-deleted 행 탐색 + update 분기 추가.
테스트 1종으로 회귀 차단: "soft-delete된 레포 재연결 → 201 + update 호출".

## 배운 것 (Lessons Learned)

**Soft delete + unique constraint는 항상 "재연결" 시나리오를 먼저 테스트하라.**
이 조합은 설계 시점에서 반드시 질문해야 할 항목: "삭제된 것을 다시 만들면 어떻게 되는가?"
이번에는 QA에서 잡혔지만, 다음부턴 soft delete가 있는 모델에 unique가 걸려있으면
구현 단계에서부터 재활성화 경로를 의무적으로 넣는다.
