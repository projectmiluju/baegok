# 배곡 (Baegok) — AI 기반 학습 성장 트래커

> 배움곡선(Learning Curve)을 자동으로 기록하고 분석하는 교육 솔루션

IT 교육생들이 매일 커밋하는 코드를 AI가 자동으로 분석하여,
"오늘 뭘 했는지", "이번 달 뭐가 부족한지", "다음에 뭘 공부해야 하는지"를 알려줍니다.

## 핵심 기능

- **일일 학습 요약** — push 시 커밋 diff를 AI가 분석하여 자동 정리
- **기간별 학습 리포트** — 특정 기간 동안의 학습 패턴, 강점/약점 분석
- **학습 로드맵** — AI 기반 다음 학습 방향 제안
- **MCP 서버** — Cursor, Claude Code 등 IDE에서 학습 데이터 직접 조회
- **주간 자동 리포트** — Celery Beat으로 매주 학습 요약 자동 생성

## 아키텍처

```
[수강생 IDE] → MCP 프로토콜 → [MCP 서버 (TypeScript)]
                                      ↓ HTTP
[GitHub Webhook: push] → [Node.js API (Hono)] → [Kafka]
                              ↓                     ↓
                         [PostgreSQL]    [FastAPI AI 서버]
                         [Redis]              ↓
                                        [Claude API]
                                              ↓
                                        분석 결과 → DB 저장

[Next.js] ← fetch → [Node.js API]

[Nginx] → 프론트(:3000) / API(:4000)
```

## 기술 스택

| 레이어      | 기술                                                 |
| ----------- | ---------------------------------------------------- |
| 프론트엔드  | Next.js 16, TypeScript, TailwindCSS, Zustand         |
| 메인 백엔드 | Node.js, TypeScript, Hono, Prisma, Zod, JWT          |
| AI 서버     | Python, FastAPI, LangChain, Claude API, Celery, Beat |
| MCP 서버    | TypeScript MCP SDK                                   |
| 메시지 큐   | Kafka, Zookeeper                                     |
| DB          | PostgreSQL (RDS), Redis (ElastiCache)                |
| 인프라      | AWS EC2, Docker Compose, Nginx                       |
| CI/CD       | GitHub Actions                                       |
| 도메인      | Gabia + Route53                                      |

기술 결정 근거는 [ADR 문서](docs/decisions/)를 참고하세요.

## 프로젝트 구조

```
baegok/
├── apps/
│   ├── web/          # Next.js 프론트엔드
│   ├── api/          # Node.js + Hono 메인 백엔드
│   ├── ai/           # Python + FastAPI AI 서버
│   └── mcp/          # TypeScript MCP 서버
├── docs/
│   ├── prd/          # 기획 문서 (PRD)
│   ├── decisions/    # 기술 결정 기록 (ADR)
│   ├── devlog/       # 개발 일지
│   └── STATUS.md     # 프로젝트 현황
└── .github/
    ├── ISSUE_TEMPLATE/
    └── PULL_REQUEST_TEMPLATE.md
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Bun (패키지 매니저)

### 환경변수 설정

```bash
cp .env.example .env
```

```env
# GitHub OAuth (https://github.com/settings/developers 에서 등록)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=http://localhost:4000/api/auth/github/callback

# Database
DATABASE_URL=postgresql://baegok:baegok@localhost:5432/baegok

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# AI
ANTHROPIC_API_KEY=

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Token Encryption (AES-256-GCM, 64 hex chars = 32 bytes)
# 생성: openssl rand -hex 32
TOKEN_ENCRYPTION_KEY=

# Frontend base URL — OAuth 콜백 후 리다이렉트 대상
WEB_BASE_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000

# Ports
PORT=4000
AI_PORT=8000
```

### 로컬 실행

```bash
# 1) 인프라 (PostgreSQL, Redis, Kafka)
#    ⚠️ docker-compose.yml은 아직 작성되지 않았다 (별도 fix 이슈로 처리 예정).
#    당분간은 PostgreSQL만 임시로 띄운다:
docker run -d --name baegok-postgres \
  -e POSTGRES_USER=baegok -e POSTGRES_PASSWORD=baegok -e POSTGRES_DB=baegok \
  -p 5432:5432 postgres:16

# 2) 의존성 설치 + Prisma 클라이언트 생성 + 마이그레이션
bun install
cd apps/api && bunx prisma generate && bun run db:migrate

# 3) 메인 백엔드
cd apps/api && bun dev

# 4) AI 서버
cd apps/ai && pip install -r requirements.txt && uvicorn src.main:app --reload --port 8000

# 5) 프론트엔드
cd apps/web && bun dev

# 6) MCP 서버
cd apps/mcp && bun dev
```

> **참고:** `bun install`만으로는 `@prisma/client` 타입이 생성되지 않는다.
> 모노레포에서 prisma의 postinstall 후크가 schema를 자동 탐지하지 못하므로,
> `apps/api`에서 `bunx prisma generate`를 명시적으로 실행해야 한다.

## 스크립트

```bash
# 린트
bun run lint          # ESLint + Prettier (TS/JS)
bun run lint:py       # Ruff + Black (Python)

# 테스트
bun run test          # 전체 테스트
bun run test:coverage # 전체 테스트 + 커버리지 리포트
bun run test:api      # API 테스트
bun run test:e2e      # Playwright E2E (web 워크스페이스)

# 빌드
bun run build         # 전체 빌드
```

## 브랜치 전략 (GitHub Flow)

```
main     ← 프로덕션 배포 (자동 배포)
develop  ← 개발 통합 (테스트 자동 실행)
feat/#이슈번호-설명 ← 기능 개발
```

- 1기능 = 1이슈 = 1PR
- Conventional Commits (`feat:`, `fix:`, `chore:`, ...)
- PR 머지 시 `Closes #이슈번호`로 이슈 자동 닫기

## 기여 가이드

1. `develop`에서 `feat/#이슈번호-설명` 브랜치 생성
2. Conventional Commits로 커밋
3. PR 생성 → 셀프 리뷰 → `develop`에 머지
4. `develop` → `main` PR → 자동 배포

## 라이선스

MIT
