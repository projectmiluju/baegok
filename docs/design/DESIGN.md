# 배곡 (Baegok) Design System

> Notion의 "warm minimalism"을 기반으로, 교육/학습 도구에 맞는 따뜻하고 격려하는 톤으로 커스터마이징.
> 심사 기준: "실무 적합성 + 창의성" — generic하지 않으면서도 깔끔한 교육 대시보드.

## 1. Visual Theme & Atmosphere

배곡은 IT 교육생이 매일 들어와 자신의 학습 성장을 확인하는 도구다. 첫 인상은 "깔끔한 노트" — 정보 밀도가 높지만 답답하지 않은 여백, 따뜻한 중성톤, 부드러운 그림자. 데이터를 보여주되 시험지가 아닌 일기장처럼 느껴져야 한다.

Notion의 "warm neutrals over cold grays" 철학을 계승하면서, 학습 성장이라는 맥락에 맞는 초록/티얼 계열 포인트 컬러를 더한다. 성장(Growth)을 상징하는 색이 UI 곳곳에서 긍정적 신호를 준다.

**핵심 키워드:**

- 따뜻한 미니멀리즘 (Warm Minimalism)
- 학습 성장의 시각화 (Growth Visualization)
- 격려하는 톤 (Encouraging Tone)
- 정보 밀도 + 여백의 균형

**Key Characteristics:**

- Inter 폰트 (NotionInter 접근 불가 — Inter로 대체, 가장 가까운 대안)
- 따뜻한 중성 팔레트: gray에 yellow-brown 언더톤 (#f6f5f4 warm white, #31302e warm dark)
- Near-black 텍스트: `rgba(0,0,0,0.95)` — 순수 검정 대신 미세한 따뜻함
- 울트라 얇은 보더: `1px solid rgba(0,0,0,0.1)` — 구조는 있되 무게 없음
- 학습 포인트 컬러: Growth Green (#2a9d99, 티얼 계열) — Notion Blue 대신 성장/교육 맥락
- 한글 최적화: `word-break: keep-all`, Pretendard 한글 폰트 fallback
- 8px 베이스 스페이싱

## 2. Color Palette & Roles

### Primary

- **Near Black** (`rgba(0,0,0,0.95)` / `#000000f2`): 본문 텍스트, 헤딩. 95% opacity로 부드러움.
- **Pure White** (`#ffffff`): 페이지 배경, 카드 표면.
- **Growth Teal** (`#2a9d99`): 주요 CTA, 학습 관련 강조, 성장 지표. Notion Blue 대신.

### Brand Accent

- **Deep Teal** (`#1e7a77`): 버튼 hover/active 상태.
- **Light Teal** (`#e6f5f4`): 뱃지 배경, 태그 표면, 성공 상태 표면.
- **Warm Orange** (`#dd5b00`): 주의/경고, "부족한 부분" 강조.
- **Soft Blue** (`#0075de`): 링크, 보조 인터랙티브 (Notion Blue 유지).

### Warm Neutral Scale

- **Warm White** (`#f6f5f4`): 배경 서피스 틴트, 섹션 교대. yellow-brown 언더톤 핵심.
- **Warm Dark** (`#31302e`): 다크 서피스, 사이드바 배경.
- **Warm Gray 500** (`#615d59`): 보조 텍스트, 설명, 뮤트 라벨.
- **Warm Gray 300** (`#a39e98`): 플레이스홀더, 비활성 상태, 캡션.

### Semantic

- **Success** (`#2a9d99`): Growth Teal과 동일 — 학습 성장 = 성공.
- **Warning** (`#dd5b00`): 부족한 부분, 주의 필요.
- **Error** (`#d93026`): 실패, 에러 상태.
- **Info** (`#0075de`): 정보, 링크.

### Interactive

- **Focus Ring** (`#097fe8`): 포커스 아웃라인.
- **Badge Bg** (`#e6f5f4`): 태그/뱃지 배경 (티얼 계열).
- **Badge Text** (`#1e7a77`): 태그/뱃지 텍스트.

### Shadows & Depth

- **Card Shadow**: `rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px, rgba(0,0,0,0.01) 0px 0.175px 1.04px`
- **Whisper Border**: `1px solid rgba(0,0,0,0.1)`

## 3. Typography Rules

### Font Family

- **Primary**: `Inter, Pretendard, -apple-system, system-ui, sans-serif`
- **한글 우선**: Pretendard가 한글 렌더링에 최적화됨 (Inter보다 기준선 안정적)
- `word-break: keep-all` 전역 적용 — 한글 단어 중간 줄바꿈 방지

### Hierarchy

| Role            | Size | Weight | Line Height | Letter Spacing | 용도                   |
| --------------- | ---- | ------ | ----------- | -------------- | ---------------------- |
| Page Title      | 36px | 700    | 1.2         | -1px           | 대시보드 제목          |
| Section Heading | 24px | 700    | 1.3         | -0.5px         | 섹션 타이틀            |
| Card Title      | 20px | 600    | 1.3         | -0.25px        | 카드 헤딩, 요약 제목   |
| Body Large      | 18px | 400    | 1.6         | normal         | 학습 요약 본문         |
| Body            | 16px | 400    | 1.6         | normal         | 일반 본문              |
| Body Medium     | 16px | 500    | 1.5         | normal         | 네비게이션, UI 텍스트  |
| Caption         | 14px | 400    | 1.4         | normal         | 메타데이터, 날짜, 보조 |
| Badge           | 12px | 600    | 1.3         | 0.5px          | 태그, 뱃지, 상태 라벨  |

### Principles

- 페이지 타이틀은 36px — Notion의 64px 디스플레이는 대시보드에 과도. 앱 내부는 36px면 충분.
- 한글 본문은 line-height 1.6 — 영문 1.5보다 높게. 한글은 세로폭이 커서 여유 필요.
- Weight 4단계: 400 (읽기), 500 (인터랙션), 600 (강조), 700 (헤딩).

## 4. Component Stylings

### Buttons

**Primary (Growth Teal)**

- Background: `#2a9d99`
- Text: `#ffffff`
- Padding: 10px 20px
- Radius: 8px
- Hover: `#1e7a77`
- Active: scale(0.97)
- Use: "리포트 생성", "레포 연결" 등 주요 CTA

**Secondary**

- Background: `rgba(0,0,0,0.05)`
- Text: `rgba(0,0,0,0.95)`
- Padding: 10px 20px
- Radius: 8px
- Hover: `rgba(0,0,0,0.08)`
- Use: "취소", "닫기" 등 보조 액션

**Ghost / Link**

- Background: transparent
- Text: `#0075de`
- Hover: underline
- Use: 인라인 링크, 부가 액션

**Tag / Badge**

- Background: `#e6f5f4`
- Text: `#1e7a77`
- Padding: 4px 10px
- Radius: 9999px (pill)
- Font: 12px weight 600
- Use: 기술 태그 (React, API, 리팩터링 등)

### Cards & Containers

**Standard Card**

- Background: `#ffffff`
- Border: `1px solid rgba(0,0,0,0.1)`
- Radius: 12px
- Shadow: Card Shadow (위 참조)
- Padding: 24px
- Use: 일일 요약, 리포트 카드, 레포 카드

**Stat Card (학습 지표)**

- Background: `#ffffff`
- Border: `1px solid rgba(0,0,0,0.1)`
- Radius: 12px
- 상단에 Growth Teal 얇은 탑 보더 (border-top: 3px solid #2a9d99)
- 큰 숫자: 36px weight 700 + Growth Teal 색상
- 라벨: 14px weight 400 Warm Gray 500
- Use: 커밋 수, 활동일 수, 학습 점수

**Empty State Card**

- Background: `#f6f5f4`
- Border: `1px dashed rgba(0,0,0,0.15)`
- Radius: 12px
- 중앙 정렬 텍스트 + 아이콘
- 텍스트: "아직 데이터가 없습니다" — Warm Gray 500
- CTA 버튼: "레포 연결하기" — Growth Teal
- Use: 첫 로그인, 데이터 없는 날

### Inputs & Forms

- Background: `#ffffff`
- Border: `1px solid #dddddd`
- Radius: 8px
- Padding: 10px 14px
- Focus: `2px solid #097fe8` outline
- Placeholder: `#a39e98`
- 날짜 선택: 캘린더 피커

### Navigation (사이드바)

- 배경: `#f6f5f4` (Warm White)
- 너비: 240px (데스크톱), 모바일에서 숨김
- 로고: 상단 좌측
- 메뉴 아이템: 16px weight 500, padding 10px 16px, radius 8px
- Active 아이템: Background `rgba(42,157,153,0.1)`, text `#2a9d99`, weight 600
- 구분선: `1px solid rgba(0,0,0,0.06)`
- 프로필: 하단에 아바타 + 이름 + 로그아웃

### 학습 요약 블록 (배곡 고유)

- 배경: `#ffffff`
- 좌측에 날짜 인디케이터 (세로 바, Growth Teal)
- 요약 텍스트: 18px weight 400, 한국어 본문
- 태그 칩들: pill badge 스타일, 가로 나열
- 커밋 수: Caption 크기로 우측 하단
- Use: 일일 학습 요약 리스트

### 리포트 카드 (배곡 고유)

- 기간 표시: "2026-04-01 ~ 2026-04-12" Caption 스타일
- 강점/약점 섹션: 녹색(강점) / 주황(약점) 좌측 바
- 로드맵 섹션: 번호 리스트, 각 항목에 체크박스 스타일
- Use: 기간 리포트 상세 페이지

## 5. Layout Principles

### Spacing System

- Base unit: 8px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px

### Grid & Container

- 최대 콘텐츠 너비: 1200px
- 사이드바: 240px 고정
- 메인 영역: 사이드바 제외 나머지 (max 960px 콘텐츠)
- 카드 그리드: 2~3 컬럼 (stat cards), 1 컬럼 (요약/리포트 리스트)
- 섹션 간격: 32~48px

### Whitespace Philosophy

- 카드 내부: 24px padding
- 카드 간 간격: 16px (같은 섹션), 32px (다른 섹션)
- Warm White (`#f6f5f4`) 배경으로 시각적 리듬 — 사이드바와 메인 영역 색 분리

### Border Radius Scale

- 4px: 인풋, 작은 버튼
- 8px: 일반 버튼, 메뉴 아이템
- 12px: 카드, 컨테이너
- 9999px: 뱃지, pill

## 6. Depth & Elevation

| Level         | Treatment                   | Use                   |
| ------------- | --------------------------- | --------------------- |
| Flat (0)      | 없음                        | 페이지 배경, 사이드바 |
| Whisper (1)   | `1px solid rgba(0,0,0,0.1)` | 카드 아웃라인, 구분선 |
| Soft Card (2) | 4-layer shadow stack        | 콘텐츠 카드           |
| Focus         | `2px solid #097fe8`         | 키보드 포커스         |

Shadow는 Notion 스타일 그대로 — 다중 레이어, 개별 opacity 0.01~0.04.

## 7. Do's and Don'ts

### Do's

- 따뜻한 중성톤 사용 — gray에 yellow-brown 언더톤
- 한글 `word-break: keep-all` 전역 적용
- 학습 데이터를 격려하는 톤으로 표현 ("3일 연속 학습 중!")
- 빈 상태에 행동 유도 CTA 포함 ("레포를 연결하면 학습이 시작됩니다")
- 태그는 pill 뱃지, 티얼 계열 배경

### Don'ts

- 순수 검정(`#000000`) 사용 금지 — 항상 `rgba(0,0,0,0.95)` 이하
- 차가운 회색(blue-gray) 사용 금지 — warm neutral만
- 보더를 1px rgba(0,0,0,0.1)보다 두껍게 금지
- 한글 단어 중간 줄바꿈 금지
- 데이터 없음을 빈 화면으로 방치 금지 — Empty State 필수
- Growth Teal을 텍스트에 과도하게 사용 금지 — CTA와 지표에만

## 8. Responsive Behavior

### Breakpoints

| Name    | Width      | Changes                             |
| ------- | ---------- | ----------------------------------- |
| Mobile  | <768px     | 사이드바 숨김, 햄버거 메뉴, 1컬럼   |
| Tablet  | 768-1024px | 사이드바 축소(아이콘만), 2컬럼 카드 |
| Desktop | >1024px    | 사이드바 240px, 2~3컬럼 카드        |

### Collapsing Strategy

- 사이드바: 데스크톱 240px → 태블릿 아이콘(56px) → 모바일 오버레이
- Stat Cards: 3컬럼 → 2컬럼 → 1컬럼 (세로 스택)
- 학습 요약: 1컬럼 유지, 카드 내부 여백 축소
- 페이지 타이틀: 36px → 28px (모바일)

## 9. Page Inventory (배곡 대시보드)

### Pages

**1. 랜딩 (`/`)**

- 비로그인: "GitHub로 시작하기" CTA + 서비스 설명
- 로그인: `/dashboard`로 리다이렉트

**2. OAuth 콜백 (`/auth/callback`)**

- 로딩 스피너 + "로그인 중..." 텍스트
- 성공: `/dashboard`로 리다이렉트

**3. 대시보드 (`/dashboard`)**

- Stat Cards 3개: 이번 주 커밋 수, 활동일 수, 가장 많이 쓴 태그
- 오늘의 학습 요약 (DailySummary)
- 최근 7일 요약 리스트

**4. 레포 관리 (`/dashboard/repos`)**

- 연결된 레포 카드 리스트
- "레포 연결하기" 버튼 → 모달: GitHub 레포 목록에서 선택

**5. 리포트 (`/dashboard/reports`)**

- 리포트 목록 (카드 형태, 기간 표시)
- "새 리포트 생성" 버튼 → 기간 선택 폼

**6. 리포트 상세 (`/dashboard/reports/[id]`)**

- 기간 + 타입 표시
- 강점/약점 섹션
- 학습 로드맵 (추천 주제, 다음 스텝)
- 해당 기간 커밋 분석 목록

### Agent Prompt Guide (Quick Reference)

```
Colors:
  Primary CTA: #2a9d99 (Growth Teal)
  Background: #ffffff
  Alt Background: #f6f5f4 (Warm White)
  Text: rgba(0,0,0,0.95)
  Secondary text: #615d59
  Muted: #a39e98
  Border: 1px solid rgba(0,0,0,0.1)
  Link: #0075de
  Tag bg: #e6f5f4
  Tag text: #1e7a77
  Warning: #dd5b00
  Error: #d93026

Font: Inter, Pretendard, sans-serif
  Page title: 36px/700
  Section heading: 24px/700
  Card title: 20px/600
  Body: 16px/400, line-height 1.6
  Caption: 14px/400
  Badge: 12px/600

Spacing: 8px base
Card radius: 12px
Button radius: 8px
Badge radius: 9999px
```
