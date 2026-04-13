# 배곡 컴포넌트 명세서

> `/build`가 바로 코딩에 착수할 수 있는 수준의 명세.
> 디자인 토큰은 `docs/design/DESIGN.md` 참조.

## 공통 규칙

- **폰트**: `Inter, Pretendard, -apple-system, sans-serif`
- **한글**: `word-break: keep-all` 전역 적용
- **아이콘**: lucide-react 사용 (Next.js 생태계 표준)
- **상태 관리**: Zustand (인증 상태)
- **API 호출**: fetch + SWR 또는 직접 fetch (가벼움 우선)
- **라우트 가드**: 미인증 시 `/`로 리다이렉트

---

## 레이아웃

### AppLayout (인증된 페이지 공통)

- **구조**: 좌측 Sidebar(240px) + 우측 Main Content
- **Sidebar 배경**: `#f6f5f4` (Warm White)
- **Main 배경**: `#ffffff`
- **모바일**: Sidebar 숨김 → 상단 헤더 + 햄버거

### Sidebar

| 요소          | 스타일                                                    |
| ------------- | --------------------------------------------------------- |
| 로고 영역     | 상단 24px padding, "🌱 배곡" 텍스트 20px/700              |
| 메뉴 아이템   | 16px/500, padding 10px 16px, radius 8px                   |
| Active 아이템 | bg `rgba(42,157,153,0.1)`, text `#2a9d99`, weight 600     |
| 구분선        | `1px solid rgba(0,0,0,0.06)`, margin 8px 16px             |
| 프로필 영역   | 하단 고정, 아바타(32px circle) + username + 로그아웃 링크 |

---

## 컴포넌트

### 1. StatCard

**역할:** 학습 지표 숫자 표시
**사용 화면:** `/dashboard`

| Prop  | 타입          | 설명           |
| ----- | ------------- | -------------- |
| label | string        | "이번 주 커밋" |
| value | string/number | "12"           |
| icon? | ReactNode     | lucide 아이콘  |

**스타일:**

- bg: `#ffffff`, border: whisper, radius: 12px
- border-top: `3px solid #2a9d99` (Growth Teal accent)
- value: 36px/700 `#2a9d99`
- label: 14px/400 `#615d59`
- padding: 24px
- min-width: 160px

**5-State:**
| 상태 | 표현 |
|---|---|
| Default | 숫자 + 라벨 |
| Loading | 숫자 자리에 skeleton pulse (gray bar) |
| Empty | value "0", label 유지 |
| Error | value "-", 에러 아이콘 |

---

### 2. DailySummaryCard

**역할:** 하루의 학습 요약 표시
**사용 화면:** `/dashboard`

| Prop        | 타입     | 설명         |
| ----------- | -------- | ------------ |
| date        | string   | "2026-04-12" |
| summaryText | string   | 요약 본문    |
| commitCount | number   | 커밋 수      |
| tags        | string[] | 기술 태그    |

**스타일:**

- bg: `#ffffff`, border: whisper, radius: 12px, padding: 20px
- 좌측 바: `4px solid #2a9d99` (border-left)
- date: 14px/500 `#615d59`
- summaryText: 16px/400, line-height 1.6, `rgba(0,0,0,0.95)`
- tags: pill badges (`#e6f5f4` bg, `#1e7a77` text, 12px/600, 9999px radius)
- commitCount: 14px/400 `#a39e98` (우측 하단)

**5-State:**
| 상태 | 표현 |
|---|---|
| Default | 전체 표시 |
| Loading | skeleton lines (3줄) + tag skeleton (2개) |
| Empty | "오늘은 커밋 기록이 없습니다" + muted text + dashed border |
| Error | "요약을 불러올 수 없습니다" + 재시도 버튼 |

---

### 3. RepoCard

**역할:** 연결된 GitHub 레포 표시
**사용 화면:** `/dashboard/repos`

| Prop         | 타입        | 설명                   |
| ------------ | ----------- | ---------------------- |
| fullName     | string      | "projectmiluju/baegok" |
| isActive     | boolean     | 활성 여부              |
| webhookId    | number/null | Webhook 상태           |
| onDisconnect | () => void  | 연결 해제 콜백         |

**스타일:**

- bg: `#ffffff`, border: whisper, radius: 12px, padding: 20px
- fullName: 18px/600 `rgba(0,0,0,0.95)`
- 상태 뱃지: "연결됨" pill (`#e6f5f4` / `#1e7a77`) 또는 "비활성" pill (`#fff3e6` / `#dd5b00`)
- 연결 해제 버튼: ghost style, `#d93026` text on hover

---

### 4. ReportCard

**역할:** 기간 리포트 카드 (목록용)
**사용 화면:** `/dashboard/reports`

| Prop       | 타입   | 설명                             |
| ---------- | ------ | -------------------------------- |
| id         | string | 리포트 ID                        |
| startDate  | string | 시작일                           |
| endDate    | string | 종료일                           |
| reportType | string | "custom" / "weekly_auto"         |
| summary    | object | { strengths, weaknesses, stats } |

**스타일:**

- bg: `#ffffff`, border: whisper, radius: 12px, padding: 24px
- 기간: 14px/500 `#615d59` ("2026-04-01 ~ 2026-04-12")
- 타입 뱃지: pill badge
- stats 요약: 커밋 수 + 활동일 수 (Caption 크기)
- 클릭 → `/dashboard/reports/[id]`
- hover: shadow 약간 강화

---

### 5. EmptyState

**역할:** 데이터 없음 표시 (전체 앱 공통)
**사용 화면:** 모든 목록형 페이지

| Prop         | 타입       | 설명                          |
| ------------ | ---------- | ----------------------------- |
| message      | string     | "아직 연결된 레포가 없습니다" |
| actionLabel? | string     | "레포 연결하기"               |
| onAction?    | () => void | CTA 클릭                      |
| icon?        | ReactNode  | lucide 아이콘                 |

**스타일:**

- bg: `#f6f5f4`, border: `1px dashed rgba(0,0,0,0.15)`, radius: 12px
- 중앙 정렬, padding: 48px
- 아이콘: 48px, `#a39e98`
- message: 16px/400 `#615d59`
- CTA 버튼: Primary (Growth Teal) — 있으면 표시

---

### 6. LoginButton (GitHub OAuth)

**역할:** GitHub 로그인 유도
**사용 화면:** `/` (랜딩)

**스타일:**

- bg: `#2a9d99`, text: `#ffffff`
- padding: 14px 28px
- radius: 8px
- font: 16px/600
- GitHub 아이콘 (lucide `Github`) 좌측
- "GitHub로 시작하기" 텍스트
- hover: `#1e7a77`
- min-width: 200px

---

### 7. TagChip

**역할:** 기술 태그 pill
**사용 화면:** 요약, 리포트 등 다수

| Prop  | 타입   | 설명                       |
| ----- | ------ | -------------------------- |
| label | string | "React", "API", "리팩터링" |

**스타일:**

- bg: `#e6f5f4`, text: `#1e7a77`
- padding: 4px 10px
- radius: 9999px
- font: 12px/600, letter-spacing: 0.5px

---

### 8. CreateReportForm

**역할:** 기간 리포트 생성 폼
**사용 화면:** `/dashboard/reports`

| 요소         | 스타일                                  |
| ------------ | --------------------------------------- |
| 시작일 input | date picker, whisper border, 8px radius |
| 종료일 input | date picker                             |
| 생성 버튼    | Primary (Growth Teal)                   |
| 로딩 상태    | 버튼 비활성 + spinner                   |

---

## 한글화 텍스트 매핑

| 영역            | 한글 텍스트                                                    |
| --------------- | -------------------------------------------------------------- |
| 랜딩 타이틀     | "AI가 당신의 학습 성장을 기록합니다"                           |
| 랜딩 서브타이틀 | "push하면 자동 분석, 매일 학습 요약, 기간 리포트, 학습 로드맵" |
| 로그인 버튼     | "GitHub로 시작하기"                                            |
| 사이드바 메뉴   | "대시보드" / "레포 관리" / "리포트"                            |
| 로그아웃        | "로그아웃"                                                     |
| 빈 요약         | "오늘은 커밋 기록이 없습니다"                                  |
| 빈 레포         | "아직 연결된 레포가 없습니다"                                  |
| 빈 리포트       | "생성된 리포트가 없습니다"                                     |
| 레포 연결       | "레포 연결하기"                                                |
| 리포트 생성     | "새 리포트 생성"                                               |
| 강점            | "잘한 것"                                                      |
| 약점            | "부족한 것"                                                    |
| 로드맵          | "다음에 할 것"                                                 |
| 로딩            | "불러오는 중..."                                               |
| 에러            | "오류가 발생했습니다"                                          |
| 재시도          | "다시 시도"                                                    |
