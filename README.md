# 🌱 배곡 (Baegok) — AI 기반 학습 성장 트래커

> 배움곡선(Learning Curve)을 자동으로 기록하고 분석하는 교육 솔루션

**🔗 라이브 URL: https://baegok.site**

IT 교육생들이 매일 커밋하는 코드를 AI가 자동으로 분석하여,
"오늘 뭘 했는지", "이번 달 뭐가 부족한지", "다음에 뭘 공부해야 하는지"를 알려줍니다.

## 핵심 기능

- **일일 학습 요약** — push 시 커밋 diff를 AI(Claude)가 분석하여 자동 정리
- **기간별 학습 리포트** — 특정 기간 동안의 학습 패턴, 강점/약점 분석
- **학습 로드맵** — AI 기반 다음 학습 방향 제안
- **MCP 서버** — Cursor, Claude Code 등 IDE에서 학습 데이터 직접 조회
- **주간 자동 리포트** — Celery Beat으로 매주 학습 요약 자동 생성

## 아키텍처

```
[브라우저] → [Nginx :443 (HTTPS)]
                 ├── / → [Next.js :3000] (프론트엔드)
                 └── /api → [Hono :4000] (API 서버)
                                ├── GitHub OAuth 인증
                                ├── Webhook 수신 → [Kafka]
                                └── 학습 데이터 CRUD
                                         ↓
                            [FastAPI :8000] (AI 서버)
                                ├── Kafka Consumer → Claude 커밋 분석
                                ├── 일일 요약 생성
                                └── 기간 리포트 + 로드맵 생성
                                         ↓
                            [Celery Beat + Worker] → 주간 자동 리포트

[IDE] → [MCP Server (stdio)] → [API 서버] → 학습 데이터 조회
```

## 기술 스택

| 레이어      | 기술                                            |
| ----------- | ----------------------------------------------- |
| 프론트엔드  | Next.js 16, React 19, TypeScript, Zustand       |
| 메인 백엔드 | Hono, Bun, Prisma 6, JWT, AES-256-GCM           |
| AI 서버     | FastAPI, SQLAlchemy, Claude API (anthropic SDK) |
| MCP 서버    | @modelcontextprotocol/sdk, TypeScript           |
| 메시지 큐   | Kafka (kafkajs / aiokafka)                      |
| 스케줄러    | Celery + Redis                                  |
| DB          | PostgreSQL 16                                   |
| 인프라      | AWS EC2, Docker Compose, Nginx, Let's Encrypt   |
| CI/CD       | GitHub Actions                                  |
| 도메인      | Gabia (baegok.site)                             |

기술 결정 근거는 [ADR 문서](docs/decisions/)를 참고하세요.

## 프로젝트 구조

```
baegok/
├── apps/
│   ├── web/          # Next.js 프론트엔드 (7 라우트, 8 컴포넌트)
│   ├── api/          # Hono API 서버 (OAuth, Webhook, CRUD)
│   ├── ai/           # FastAPI AI 서버 (Claude 분석, Celery)
│   └── mcp/          # MCP 서버 (4 도구)
├── docs/
│   ├── prd/          # 기획 문서 (PRD)
│   ├── decisions/    # 기술 결정 기록 (ADR 11건)
│   ├── devlog/       # 개발 일지 (4건)
│   ├── design/       # 디자인 시스템 + 컴포넌트 명세
│   └── STATUS.md     # 프로젝트 현황
├── nginx/            # Nginx 리버스 프록시 설정
├── docker-compose.yml          # 로컬 개발 (인프라)
├── docker-compose.prod.yml     # 운영 배포 (전체 서비스)
└── .github/
    ├── workflows/    # CI/CD (ci.yml, deploy.yml)
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

## 시작하기

### 사전 요구사항

- Bun 1.2+
- Python 3.9+
- Docker & Docker Compose

### 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 GitHub OAuth, Anthropic API 키 등 설정
```

### 로컬 실행

```bash
# 1) 인프라 (PostgreSQL, Redis, Kafka, Zookeeper)
docker compose up -d

# 2) 의존성 설치 + Prisma
bun install
cd apps/api && bunx prisma generate && bunx prisma migrate dev

# 3) 각 서비스 실행 (별도 터미널)
cd apps/api && bun dev       # API 서버 (:4000)
cd apps/ai && pip install -r requirements.txt && uvicorn src.main:app --reload --port 8000
cd apps/web && bun dev       # 프론트엔드 (:3000)
cd apps/mcp && bun dev       # MCP 서버
```

## 개발 과정

| 이슈 | 기능                         | 테스트 |
| ---- | ---------------------------- | ------ |
| #1   | 모노레포 구조 + 개발 환경    | -      |
| #3   | GitHub OAuth + JWT 세션      | 30개   |
| #4   | 레포 연결 + Webhook 등록     | 10개   |
| #5   | Webhook → Kafka 발행         | 9개    |
| #6   | Kafka Consumer + Claude 분석 | 10개   |
| #7   | 일일 학습 요약 API           | 11개   |
| #8   | 기간 리포트 + 로드맵         | 15개   |
| #9   | Celery Beat 주간 자동 리포트 | 5개    |
| #10  | 대시보드 UI                  | -      |
| #11  | MCP 서버                     | 5개    |
| #12  | AWS 배포 (HTTPS)             | -      |

**7일 개발, 12개 이슈, 19 PR, 95+ 테스트, 11 ADR**

## AI 활용

이 프로젝트는 [miluju-studio](docs/ai-report.md) AI 워크플로우로 개발되었습니다.
자세한 AI 활용 과정은 [AI 활용 리포트](docs/ai-report.md)를 참고하세요.

## 라이선스

MIT
