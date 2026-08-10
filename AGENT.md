# 프로젝트 지침서 (`Agent.md`)

## 1. 프로젝트 개요 및 구조 (Project Structure)

* **프로젝트명**: `mystockapp` (Google Sheets 연동 실시간 주식 포트폴리오 관리 앱)
* **주요 디렉터리 구성**:
  * `app/`: Next.js 14 App Router (메인 대시보드 `/`, 분석 화면 `/analysis`, API Routes `/api/*`)
  * `components/`: UI 컴포넌트 (`FilterModal.tsx`, `AccountsDrawer.tsx`, `BottomNav.tsx` 등)
  * `lib/`: 핵심 서버 모듈 (`googleSheets.ts` - 구글 시트 파서, `stockFetcher.ts` - 실시간 시세/환율 수집기)
  * `public/`: 정적 파비콘 및 아이콘 리소스
* **실행 및 인프라 환경**:
  * **개발 환경**: Next.js 개발 서버 (`npm run dev`) + Google Sheets API (`googleapis`)
  * **운영/배포 환경**: Vercel 배포 또는 Docker 기반 Next.js 독립 실행 서버
  * **데이터베이스 (DB)**: Google Sheets (`mystockapp_db`)
    * `초기자산` 탭: 보유 평단가, 수량, 증권사/계좌, 통화, 자산 유형
    * `거래내역` 탭: 매수/매도 내역 및 실현손익(`realized_pnl`)
    * `History` 탭: 일자별 원화 평가액(`Value_KRW`) 스냅샷

---

## 2. 커밋 및 배포 규칙 (Git & Deployment)

### 2.1. 커밋 메시지 규격 (Conventional Commits)
* 커밋 메시지는 `type(scope): subject` 형식을 엄격히 준수한다.
* **Type**:
  * `feat`: 새로운 기능 추가 (예: 시세 필터 칩 추가, 환율 자동 적용)
  * `fix`: 버그 수정 (예: 구글 시트 파싱 에러 수정)
  * `docs`: 문서 수정 (예: `Agent.md`, `.env.example` 업데이트)
  * `refactor`: 코드 구조 개선
  * `style`: 토스 스타일 UI/CSS 포맷팅 및 스타일링
  * `test`: API 및 수집기 테스트 코드
  * `chore`: 빌드, 패키지 설정 (`package.json`, `.env` 템플릿 등)
* **Scope**: `app`, `components`, `sheets`, `stocks`, `ui` 등
* **Subject**: 한국어로 간결하게 작성하고 문장 끝 마침표(`.`) 생략 (예: `feat(stocks): 미국장 시간외 시세 파싱 로직 구현`)

### 2.2. 커밋 실행 안전 규칙 (AI 에이전트 필수 준수)
* **명시적 파일 추가**: `git add .` 금지. 실제 수정한 파일만 명시적으로 커밋에 추가한다.
* **기존 변경 사항 보호**: 에이전트 작업 이전의 미커밋 변경 파일은 제외한다.
* **승인 프롬프트 기반 커밋**: 추천 커밋 메시지와 변경 요약을 제시하고 시스템 승인 팝업을 유도하여 사용자가 승인한 경우에만 진행한다.

### 2.3. 보안 및 설정 관리 (Security & Environment)
* **인증 정보 보호**: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` 등 인증 키는 소스코드에 하드코딩하지 않고 `.env.local`로 관리한다.
* **환경 변수 템플릿**: `.env.example` 또는 `.env.local` 템플릿을 최신 상태로 유지한다.

---

## 3. 빌드 및 실행 지침 (Build & Execution)

* **개발 서버 실행**: `npm run dev` (기본 포트: 3000)
* **프로덕션 빌드 및 검증**: `npm run build && npm start`
* **의존성 패키지**: `googleapis`, `yahoo-finance2`, `recharts`, `lucide-react`, `framer-motion`, `tailwindcss`

---

## 4. 스타일 가이드 (Style Guide)

* **디자인 시스템 (Toss-style White Modern Theme)**:
  * 배경: Pure White (`#FFFFFF`), Off-White (`#F8F9FA`)
  * 카드/테두리: Card (`#F8F9FA`), Border (`#E5E8EB`)
  * 텍스트: Main (`#191F28`), Sub (`#8B95A1`)
* **주식 가격 및 수익률 색상 지침 (미국 주식 스타일)**:
  * **상승 / 수익 (+)**: Green (`#22C55E`)
  * **하락 / 손실 (-)**: Red (`#EF4444`)
* **구글 시트 칼럼 주석 및 매핑**:
  * `초기자산`: `id`, `date`, `category`, `ticker`, `account`, `currency`, `quantity`, `average_price`
  * `거래내역`: `id`, `date`, `category`, `ticker`, `account`, `currency`, `type`(매수/매도), `quantity`, `price`, `realized_pnl`
  * `History`: `Date`, `Category`, `Account`, `Value_KRW`, `Ticker`

---

## 5. API 설계 가이드 (API Design)

* **`/api/portfolio/route.ts` (포트폴리오 백엔드 API)**:
  * 구글 시트 데이터를 읽어와 실시간 시세와 결합한 종합 평가 데이터 반환
  * **다차원 필터링 query param 지원**:
    * `market`: `all` | `kr` | `us`
    * `account`: `all` | `메리츠` | `키움` | `퇴직연금` | `피델리티` 등
    * `currency`: `all` | `KRW` | `USD`
    * `mode`: `regular` | `evaluation`
* **`/api/stocks/route.ts` (실시간 시세 & 환율 API)**:
  * 미국 주식: `yahoo-finance2` 활용 (정규장 + Pre/Post Market 시세, 장 상태 스티커)
  * 한국 주식: 정규장 및 시간외 단일가 시세 수집
  * 환율: USD/KRW 실시간 환율 수집 및 원화 평가금액(`Value_KRW`) 자동 산출

---

## 6. 테스트 및 품질 관리 (Testing & Quality)

* **Browser Subagent 자동 검증**:
  * 개발 완료 후 내장 브라우저를 구동하여 화이트 테마 대시보드(`/`)와 분석 페이지(`/analysis`)의 레이아웃, 미국식 색상 적용(Green/Red), 다차원 필터 칩 동작 상태를 스크린샷과 함께 직접 검증한다.

---

## 7. 대화 및 협업 규칙 (Communication)

* **한국어 응답**: 에이전트의 모든 설명, 코드 주석, 결과 리포트는 한국어로 작성한다.
* **화면 및 API 연동 명확화**: 메인 대시보드, 계좌 서랍, 바텀 시트 필터 모달, 분석 탭 연동 시 변경점을 즉시 보고한다.
* **토큰 최적화**: 코드 작성 및 대화 시 필요한 내용만 명확하고 간결하게 전달한다.