# [PRD] 배곡 (Baegok) — AI 기반 학습 성장 트래커

**Status:** Draft
**Date:** 2026-04-07
**Deadline:** 2026-04-13 (2026 KIT 바이브코딩 공모전)
**Branch:** develop

---

## 1. 개요 (Overview)

### 배경 및 목적

IT 교육생들은 긴 교육 기간 동안 매일 바쁘게 학습하지만, 대부분 기록을 남기지 않는다.
교육이 끝나면 "내가 뭘 했는지" 정리하는 데 다시 시간을 써야 하고, 교강사도 수강생의 학습 상황을
대화 없이는 파악하기 어렵다.

배곡은 수강생의 GitHub 커밋을 자동으로 분석하여:
- **수강생에게:** 매일 뭘 했는지 자동 정리, 기간별 분석, 학습 로드맵 제공
- **교강사에게:** 수강생이 뭘 열심히 하고 뭘 놓치는지 대화 없이도 파악 가능

### 타겟 워크플로우

```
수강생이 평소처럼 코딩하고 push
  → 배곡이 자동으로 커밋 분석 → 일일 학습 요약 생성
  → 원할 때 기간별 리포트/로드맵 조회
  → IDE(Cursor/Claude Code 등)에서 MCP로 학습 데이터 직접 조회
```

### 공모전 정보

| 항목 | 내용 |
|------|------|
| 공모전 | 2026 KIT 바이브코딩 공모전 |
| 주제 | AI활용 차세대 교육 솔루션 |
| 마감 | 2026-04-13 (월) |
| 참가 형태 | 개인 (1인) |
| 제출물 | ① GitHub 레포(public) ② 라이브 URL ③ AI 리포트(PDF) ④ 동의서/각서(PDF) |
| 주의 | 마감 이후 커밋 = 부정행위 처리 |

### 심사 기준

| 기준 | 세부 | 전략 |
|------|------|------|
| AI 활용 능력 | 프롬프트 전략, 도구 숙련도, 협업 과정 | AI 기획문서/지침서 포함, 협업 환경 풀세팅 |
| 기술적 완성도 | MVP 작동 여부, 배포 안정성 | 실제 작동하는 배포된 서비스 |
| 실무 적합성 | 문제 해결 적절성, 현장 도입 가능성 | 실제 교육 현장에서 쓸 수 있는 솔루션 |
| 창의성 및 확장성 | 아이디어 독창성, 비즈니스 가치 | MCP 연동이라는 차별화 + 성장 가능성 |

---

## 2. 핵심 요구사항 (Core Requirements)

### MVP1 — 필수 구현

- [ ] GitHub OAuth 로그인/로그아웃
- [ ] 레포 연결 (로그인 후 추적할 레포 선택, 복수 가능)
- [ ] Webhook 자동 등록 (레포 선택 시 GitHub Webhook 자동 생성)
- [ ] push 이벤트 수신 → Kafka 발행
- [ ] Kafka Consumer → GitHub API로 diff 조회 → Claude API로 분석 → DB 저장
- [ ] 일일 학습 요약 조회
- [ ] 기간별 학습 리포트 (특정 기간 선택 → 분석)
- [ ] 학습 로드맵 생성 (분석 기반 다음 학습 방향 제안)
- [ ] 대시보드 UI (일일 요약, 기간 리포트, 로드맵)
- [ ] MCP 서버 (IDE에서 학습 데이터 직접 조회)
- [ ] Celery Beat 주간 리포트 (매주 자동 요약 생성)
- [ ] 협업 환경 풀세팅 (이슈/PR 템플릿, 브랜치 전략, 린트, CI/CD)
- [ ] AWS 배포 (EC2 + Docker Compose + Nginx + Gabia 도메인)

### MVP2 — 시간 허용 시 추가

- [ ] 교강사 대시보드 (수강생 현황 한눈에 파악)
- [ ] 학습 곡선 시각화 (차트)
- [ ] 알림 (이메일/슬랙 — 리포트 생성 시)
- [ ] 과거 커밋 소급 분석 (레포 연결 시 기존 커밋도 분석)

---

## 3. 데이터 및 상태 정의 (Data & State Models)

### 핵심 데이터 모델

```
User
  ├── id (PK)
  ├── github_id (unique)
  ├── github_username
  ├── avatar_url
  ├── access_token (암호화 저장)
  ├── created_at
  └── updated_at

Repository
  ├── id (PK)
  ├── user_id (FK → User)
  ├── github_repo_id
  ├── full_name (예: "user/repo")
  ├── webhook_id
  ├── is_active
  ├── created_at
  └── deleted_at (soft delete)

CommitAnalysis
  ├── id (PK)
  ├── repository_id (FK → Repository)
  ├── commit_sha
  ├── commit_message
  ├── committed_at
  ├── diff_summary (AI 생성 요약)
  ├── tags (JSONB — 예: ["React", "API", "버그수정"])
  ├── created_at
  └── deleted_at (soft delete)

DailySummary
  ├── id (PK)
  ├── user_id (FK → User)
  ├── date
  ├── summary_text (AI 생성 일일 요약)
  ├── commit_count
  ├── tags (JSONB — 그날 다룬 기술/주제)
  ├── created_at
  └── updated_at

PeriodReport
  ├── id (PK)
  ├── user_id (FK → User)
  ├── start_date
  ├── end_date
  ├── report_type (ENUM: 'weekly_auto' | 'custom')
  ├── summary (JSONB — 잘한 것, 부족한 것, 통계)
  ├── roadmap (JSONB — 추천 학습 방향)
  ├── created_at
  └── deleted_at (soft delete)
```

### 상태 전이도

```
Webhook 수신:
  Idle → Received → Kafka Published → AI Processing → Analyzed → Stored
                                          ↓ (실패 시)
                                        Failed (로그만 남기고 다음 push에서 재처리)

레포 연결:
  미연결 → 연결 중 (Webhook 생성) → 활성 → 비활성화 (soft delete)
```

### API 엔드포인트 (예상)

```
# 인증
GET    /api/auth/github          — GitHub OAuth 리다이렉트
GET    /api/auth/github/callback — OAuth 콜백, JWT 발급
POST   /api/auth/logout          — 로그아웃
GET    /api/auth/me              — 현재 사용자 정보

# 레포 관리
GET    /api/repositories         — 연결된 레포 목록
GET    /api/repositories/github  — GitHub에서 내 레포 목록 조회
POST   /api/repositories         — 레포 연결 + Webhook 등록
DELETE /api/repositories/:id     — 레포 연결 해제 + Webhook 삭제

# Webhook
POST   /api/webhooks/github      — GitHub push 이벤트 수신

# 학습 데이터
GET    /api/summaries/daily      — 일일 요약 목록 (쿼리: ?date=2026-04-07)
GET    /api/summaries/daily/:id  — 일일 요약 상세

# 리포트
POST   /api/reports              — 기간별 리포트 생성 요청
GET    /api/reports              — 내 리포트 목록
GET    /api/reports/:id          — 리포트 상세 (요약 + 로드맵 포함)

# AI 서버 (내부 — Node.js → FastAPI)
POST   /ai/analyze-commits       — 커밋 diff 분석 요청
POST   /ai/generate-report       — 기간별 리포트 생성
POST   /ai/generate-roadmap      — 학습 로드맵 생성
```

---

## 4. 예외 처리 정책 (Exception Handling)

| 상황 | 대응 방안 | 우선순위 |
|------|---------|---------|
| 노이즈 커밋 ("fix typo", "asdf") | AI가 diff 기반으로 필터링. 메시지가 무의미해도 코드 변경 내용으로 판단 | P0 |
| 하루 커밋 0건 | "오늘은 커밋 기록이 없습니다" 표시 | P0 |
| 대량 커밋 (하루 50건+) | 전체 분석하되, 요약은 핵심 변경 3~5개로 압축 | P1 |
| 레포 연결 후 과거 데이터 | 연결 시점 이후 push만 분석. 과거 소급은 MVP2 | P0 |
| Webhook 실패/누락 | 재시도 없음. 다음 push에서 누적 커밋 일괄 분석 | P1 |
| 동시 push (같은 레포) | 선착순 처리, 큐 없음 | P2 |
| 데이터 삭제 | Soft delete (deleted_at). 학습 기록은 복구 가능해야 함 | P0 |
| 비로그인 접근 | 로그인 페이지로 리다이렉트 | P0 |
| GitHub API rate limit 초과 | OAuth 토큰 기준 5,000회/시간. 초과 시 "잠시 후 다시 시도" 안내 | P2 |
| Claude API 실패/타임아웃 | 분석 실패 로그 남기고, 다음 push 시 미분석 커밋 포함하여 재처리 | P1 |

---

## 5. 기술 스택 (Technology Stack)

### 선택한 접근법: 3서버 + MCP 구조

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **프론트엔드** | Next.js 16 + TypeScript + TailwindCSS + Zustand | UI 전용 |
| **메인 백엔드** | Node.js + TypeScript + Hono + Prisma + Zod + JWT | OAuth, CRUD, Webhook 수신, 세션 관리 |
| **AI 서버** | Python + FastAPI + LangChain + Claude API + Celery + Beat | Kafka Consumer, 커밋 분석/요약/로드맵 |
| **MCP 서버** | TypeScript MCP SDK | IDE 연동, 학습 데이터 조회 |
| **메시지 큐** | Kafka + Zookeeper | push 이벤트 → AI 분석 비동기 처리 |
| **DB** | PostgreSQL (RDS) + Redis (ElastiCache) | 메인 저장소 + 캐싱/세션 |
| **인프라** | AWS EC2 + Docker Compose + Nginx | 배포 |
| **도메인** | Gabia + Route53 | DNS |
| **CI/CD** | GitHub Actions | develop 병합 시 테스트, main 병합 시 배포 |

### 아키텍처

```
[수강생 IDE: Cursor / Claude Code / Gemini CLI]
        ↓ MCP 프로토콜 (stdio)
[TypeScript MCP 서버] → HTTP → [Node.js API]

[GitHub Webhook: push 이벤트]
        ↓
[Node.js 메인 API (:4000)]
   ├→ GitHub OAuth + JWT 인증
   ├→ 레포 CRUD + Webhook 관리
   └→ Kafka 메시지 발행 (commit-analysis 토픽)
              ↓
[Kafka]
              ↓
[FastAPI AI 서버 (:8000)] ← Kafka Consumer
   ├→ GitHub API로 diff 조회
   ├→ Claude API로 분석/요약/로드맵
   ├→ Celery Beat: 주간 자동 리포트
   └→ 결과 DB 저장

[Next.js (:3000)] ← 프론트엔드 전용
        ↓ fetch
[Node.js API]

[Nginx]
  → baegok.도메인         → Next.js (:3000)
  → baegok.도메인/api/    → Node.js (:4000)
  (FastAPI는 외부 노출 없음 — 내부 Kafka Consumer + 내부 API)

[PostgreSQL (RDS)] ← 사용자, 레포, 학습 요약, 리포트
[Redis (ElastiCache)] ← 캐싱, 세션, Celery 브로커
```

### 협업 환경 (DX)

```
커밋 시 (Husky pre-commit):
  → lint-staged
    → ESLint + Prettier (TS/JS)
    → Ruff + Black (Python)
    → hadolint (Dockerfile)

커밋 메시지 (Husky commit-msg):
  → commitlint (Conventional Commits)

PR:
  → PR 템플릿 자동 적용
  → CODEOWNERS 자동 리뷰어

develop 병합 (GitHub Actions):
  → ESLint + 타입체크 + 테스트

main 병합 (GitHub Actions):
  → 테스트 + Docker 빌드 + AWS 배포

기타:
  → .editorconfig
  → Branch protection (develop, main 직접 push 차단)
  → Conventional PR title 검증
  → CHANGELOG 자동 생성
```

### 선정 근거

- **Node.js 메인 백엔드 분리:** Next.js는 프론트 전용, API 로직은 Node.js에서 관리. TypeScript 공유로 프론트-백엔드-MCP 간 타입 일관성
- **FastAPI AI 전용:** Python AI 생태계(LangChain, Celery) 활용. 메인 API와 분리하여 AI 로직 독립
- **Kafka:** Webhook 수신 → AI 분석 비동기 처리. GitHub Webhook 타임아웃 방지, 실패 복구, 부하 분산
- **MCP 서버:** 배곡의 핵심 차별점. TypeScript MCP SDK로 IDE 연동
- **Hono:** Express 대비 경량, TypeScript 네이티브, Web Standard API 기반

---

## 6. 아웃 오브 스코프 (Out of Scope)

| 제외 기능 | 제외 이유 | 예상 도입 시기 |
|----------|----------|-------------|
| 교강사 대시보드 + 역할/권한 | 역할 시스템 전체 설계 필요, 스코프 폭발 | MVP2 |
| 학습 곡선 시각화 (차트) | 대시보드 고도화 | MVP2 |
| 알림 (이메일/슬랙) | 리포트 생성 시 알림 발송 | MVP2 |
| 과거 커밋 소급 분석 | API rate limit + 비용 | MVP2 |
| pgvector + RAG | 시맨틱 검색은 v1 핵심 가치 아님 | v3 |
| Fine-tuning (LLaMA + LoRA) | Claude API로 충분, 학습 데이터 없음 | v3 |
| Terraform (IaC) | AWS 콘솔로 빠르게 세팅 | v3 |
| K8s (EKS) | Docker Compose on EC2로 충분 | v3 |
| 모니터링 (Prometheus + Grafana) | 헬스체크 엔드포인트로 충분 | v3 |
| MongoDB | PostgreSQL JSONB로 비정형 대응 가능 | v3 |

---

## 7. 다음 액션 플랜 (Next Actions)

### 구현 순서

```
Day 1 (4/8): 환경 세팅
  → 협업 환경 풀세팅 (린트, 훅, 템플릿, 브랜치 전략)
  → 모노레포 구조 생성 (web, api, ai, mcp)
  → Docker Compose (PostgreSQL, Redis, Kafka)
  → DB 스키마 (Prisma)

Day 2 (4/9): 인증 + 핵심 API
  → GitHub OAuth 로그인
  → 레포 연결 + Webhook 자동 등록
  → Webhook 수신 → Kafka 발행

Day 3 (4/10): AI 분석 파이프라인
  → FastAPI Kafka Consumer
  → Claude API 커밋 diff 분석
  → 일일 요약 자동 생성
  → Celery Beat 주간 리포트

Day 4 (4/11): 프론트엔드 + MCP
  → 대시보드 UI (일일 요약, 기간 리포트, 로드맵)
  → MCP 서버 구현

Day 5 (4/12): 배포 + 마무리
  → AWS 세팅 (EC2, RDS, ElastiCache, Route53)
  → Docker Compose 배포
  → Nginx + 도메인 연결
  → E2E 테스트 + 버그 수정

Day 6 (4/13): 제출
  → AI 리포트(PDF) 작성
  → 최종 점검 + 제출
  → ⚠️ 마감 이후 커밋 금지
```

### 핸드오프

| 다음 스킬 | 전달 내용 |
|----------|----------|
| `/build` | 이 PRD + Issue 번호 목록 + 구현 순서 |
| `/ui` | 대시보드 화면 설계가 필요하면 `/ui` → `/build` 순서 |

---

## 부록: 기술 결정 요약 (ADR)

| ADR | 결정 | 근거 |
|-----|------|------|
| ADR-001 | Node.js 메인 백엔드 (Hono) | TypeScript 통일, FastAPI는 AI 전용 |
| ADR-002 | FastAPI AI 전용 서버 | Python AI 생태계 활용, 역할 분리 |
| ADR-003 | Kafka 비동기 처리 | Webhook 타임아웃 방지, 실패 복구 |
| ADR-004 | Claude API (Fine-tuning 없이) | D-6에 충분한 품질, 학습 데이터 없음 |
| ADR-005 | MCP 서버 직접 구현 | 핵심 차별점, IDE 연동으로 차별화 |
| ADR-006 | PostgreSQL JSONB (MongoDB 제외) | DB 단일화, 비정형 데이터 JSONB로 충분 |
| ADR-007 | Docker Compose on EC2 (K8s 제외) | D-6에 적정한 인프라 복잡도 |
| ADR-008 | GitHub Flow (main/develop/feature) | 1인이지만 협업 준비된 브랜치 전략 |
