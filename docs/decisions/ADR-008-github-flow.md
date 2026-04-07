# ADR-008: GitHub Flow 브랜치 전략 (main/develop/feature)

**일자:** 2026-04-07
**상태:** Accepted

## 맥락 (Context)

1인 개발이지만, 협업 준비가 된 개발 환경을 구축해야 한다.
공모전 심사 기준 "AI 활용 능력 — 협업 과정"에서
체계적인 브랜치 전략과 이슈 관리가 평가 대상이다.

## 고려한 선택지

### 선택지 A: main 단일 브랜치
- 장점: 단순함
- 단점: 협업 불가능, 배포와 개발이 섞임, 심사에서 감점

### 선택지 B: GitHub Flow (main + develop + feature)
- 장점: 1인이지만 협업 구조 갖춤, develop에서 테스트 → main에서 배포 분리
- 단점: 1인에게 약간의 오버헤드

## 결정 (Decision)

**선택지 B: GitHub Flow.**
- `main`: 프로덕션 배포. main 머지 시 GitHub Actions로 자동 배포.
- `develop`: 개발 통합. develop 머지 시 테스트 자동 실행.
- `feat/#이슈번호-설명`: 기능 개발. 1기능 = 1이슈 = 1PR.

추가 환경:
- Issue 템플릿 (feature_request, task, bug_report)
- PR 템플릿 (변경 유형, 영향 범위, 체크리스트)
- Branch protection rules (직접 push 차단)
- Husky + lint-staged + ESLint + Prettier + commitlint
- CODEOWNERS, EditorConfig

## 결과 (Consequences)

- 긍정적: 협업 준비 완료, 코드 품질 자동화, 심사 "협업 과정" 어필
- 부정적: 1인 개발에 PR 셀프 리뷰 오버헤드
- 리스크: 시간 압박 시 프로세스를 무시하고 싶은 유혹

## 되돌릴 조건 (Reversal Triggers)

- 되돌릴 이유 없음. 이 전략은 프로젝트 규모와 관계없이 유지.
