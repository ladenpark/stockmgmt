# Repository Guidelines

## 프로젝트 구조

- `backend/`: Laravel 12 + PostgreSQL을 사용하는 API. Artisan 명령과 마이그레이션은 `backend/src`에서 실행한다.
- `web/`: React 18 + Vite 기반 CMS 프런트엔드. 운영에서는 `https://cms.tomato-pouch.kro.kr` 도메인으로 분리해 서빙한다.
- `mobile-web-next/`: Next.js 기반 사용자 모바일/웹 프런트엔드. 운영에서는 경로 prefix 없이 루트 사용자 도메인 `https://tomato-pouch.kro.kr`에서 서빙한다.

- `app/`: Flutter 기반 네이티브 앱 프런트엔드. 공용 Flutter 코드(`app/lib`)와 자산을 공유하며, `app/android`는 네이티브 앱 코드, `app/web`은 Flutter 웹 빌드 자산을 담는다.
- `docker-compose.yml`: 개발용 Postgres, Redis 중심 compose. 현재 개발은 백엔드/CMS/사용자 웹을 호스트에서 직접 실행하고 DB/Redis만 Docker로 띄우는 방식을 기본으로 한다.
- `docker-compose.prod.yml`: 운영 준비용 compose. Laravel PHP-FPM API, queue worker, nginx, 사용자 웹, CMS, certbot, Postgres, Redis를 분리한다.
- 기타 문서는 `docs/`, 디자인 자료는 `design/` 아래에 있으며 추가 앱(workspace)은 없다.

## 빌드·실행 방법

- **Backend 개발**: `cd backend/src && composer install && php artisan serve --host=127.0.0.1 --port=8003`. 마이그레이션/테스트는 `php artisan migrate`, `php artisan test`를 사용한다.
- **CMS 개발**: `cd web && npm install && npm run dev`.
- **사용자 웹 개발**: `cd mobile-web-next && npm install && npm run dev`.
- **개발 DB/Redis**: 프로젝트 루트에서 `docker compose up -d postgres redis`; 종료는 `docker compose down`.
- **운영 배포 준비**: `docker-compose.prod.yml`을 기준으로 빌드/기동한다. 운영 마이그레이션은 자동 실행하지 않고 `docker compose -f docker-compose.prod.yml run --rm backend php artisan migrate --pretend` 확인 후 `docker compose -f docker-compose.prod.yml run --rm backend php artisan migrate --force`로 실행한다.
- 캐시·큐 등 Laravel 운영 명령은 `docker compose -f docker-compose.prod.yml run --rm backend php artisan <command>`를 우선 사용한다.

## 스타일 가이드

- PHP는 Laravel 기본(PSR-12) 규칙을 따른다. 컨트롤러·모델은 `StudlyCase`, 메서드·변수는 `camelCase`.
- **백엔드 데이터 조회 규칙**: N+1 문제와 과도한 관계 로딩/조인을 방지하기 위해, 목록·상세·집계 API와 배치성 작업의 DB 조회는 Eloquent 관계 로딩보다 Query Builder(`DB::table()` 또는 `Model::query()`의 명시적 select/join/subquery)를 우선 사용한다. Eloquent 모델은 단순 단건 생성·수정이나 도메인 상수/캐스팅 활용이 명확한 경우에만 제한적으로 사용하고, 관계 접근으로 암묵적 추가 쿼리가 발생하지 않도록 한다.
- React 코드는 함수 컴포넌트와 훅 중심으로 작성하며 ESLint + Prettier 기본 설정을 따른다.
- 환경 변수 템플릿은 `backend/src/.env.example`, `web/.env.example`에 업데이트하고 버전에 맞춘다.
- **DB 마이그레이션 규칙**: 테이블을 생성하거나 컬럼을 생성·수정할 때는 해당 테이블/컬럼의 의미를 설명하는 한국어 `comment`를 반드시 추가한다. 외래 키 컬럼은 `사용자 ID(users.id)`처럼 원본 테이블과 키 컬럼을 괄호로 함께 적는다. 상태값/타입값 컬럼은 `0:비활성, 1:활성`, `출처 타입(인플루언서, 검색)`처럼 가능한 값의 의미를 한국어로 함께 적는다.

## API 설계 가이드

- 앱 사용자 기능은 `/api/app/*` 계열의 앱 전용 API 스타일을 따른다. CMS 관리자 기능은 `/api/*` 계열의 관리용 API 스타일을 따르며, 두 스타일을 섞지 않는다.
- 앱 API는 화면 중심으로 필요한 데이터만 가공해서 내려주는 응답을 우선한다. 프런트가 조합해야 하는 범용 CRUD 응답보다, 앱 화면에서 바로 사용할 수 있는 payload를 선호한다.
- 앱 API의 목록 응답은 기본적으로 `{ data, meta: { page, perPage, hasMore } }` 형태를 따른다. 모바일 무한 스크롤/더보기 UI를 기준으로 설계하고, CMS에서 쓰는 paginator 메타 구조를 그대로 복제하지 않는다.
- CMS API의 목록 응답은 관리자 화면에 맞는 Laravel paginator/관리형 리스트 메타 구조를 유지한다. 총 개수, 현재 페이지, 정렬/필터 관리가 필요한 CMS 요구사항을 우선한다.
- 앱 API에서는 사용자 맥락을 설명하는 메타데이터(`source_type`, `source_id`, `source_influencer` 등)를 응답에 포함할 수 있다. 단, 단일 화면 요구사항을 해결하기 위한 목적이 분명할 때만 추가한다.
- 새로운 API를 만들 때 먼저 이 기능이 앱용인지 CMS용인지 구분하고, 기존 유사 API의 경로, 인증 미들웨어, 응답 형태, 페이지네이션 방식을 그대로 맞춘다.

## 테스트 가이드

- 현재 자동화 테스트가 적으므로 중요 기능 추가 시 `php artisan test` 기반의 Feature/Unit 테스트를 작성한다.
- 프런트엔드는 Vitest/RTL 기반 테스트를 `web/src/**/*.test.tsx`로 추가한다.
- Docker 운영 이미지를 새로 빌드할 때 최소한 `docker compose -f docker-compose.prod.yml run --rm backend php artisan migrate --pretend`로 마이그레이션 확인을 권장한다.

## 커밋·배포

- 커밋 메시지는 Conventional Commit 형식을 따른다: `type(scope): subject`.
- `type`은 `feat`(기능), `fix`(버그 수정), `docs`(문서), `refactor`(동작 변경 없는 구조 개선), `style`(포맷/스타일), `test`(테스트), `chore`(빌드·설정·잡무), `perf`(성능), `ci`(CI/CD) 중에서 선택한다.
- `scope`는 가능하면 변경 영역을 짧게 적는다: `backend`, `cms`, `app`, `mobile-web`, `infra`, `docs` 등.
- `subject`는 한글로 간결하게 작성하고 마침표를 붙이지 않는다. 예: `fix(mobile-web): 상품 상세 이미지 비율 보정`.
- 작업이 끝나면 에이전트는 변경 요약과 적절한 커밋 메시지를 제안한 뒤, 채팅으로 `예/아니오`를 묻지 않고 실제 `git add ... && git commit -m "..."` 명령을 실행해 승인 프롬프트가 뜨게 한다.
- 사용자가 승인 프롬프트에서 허용한 경우에만 커밋한다. 거부한 경우에는 커밋하지 않고 종료하거나 다음 지시를 기다린다.
- 커밋할 때는 에이전트가 이번 작업에서 만든/수정한 파일만 명시적으로 `git add`하고, 기존 미커밋 변경은 포함하지 않는다.
- 운영 전환/배포 기준은 `docs/deployment/26.05.12_런칭전_운영배포전환.md`를 우선 확인한다.
- 운영 도메인 구조: 사용자 웹 `https://tomato-pouch.kro.kr`, CMS `https://cms.tomato-pouch.kro.kr`, API `https://api.tomato-pouch.kro.kr/api`.
- 운영 배포 전 순서: `git pull` → `docker compose -f docker-compose.prod.yml build backend nginx mobile_web` → `docker compose -f docker-compose.prod.yml up -d backend nginx mobile_web queue_default queue_subtitle` → `docker compose -f docker-compose.prod.yml run --rm backend php artisan migrate --pretend` → 필요 시 `docker compose -f docker-compose.prod.yml run --rm backend php artisan migrate --force`.

## 보안/설정

- 개발 백엔드는 `backend/src/.env`, 운영 백엔드는 루트 `.env.backend.prod`를 사용한다. 운영 값을 개발 `.env`에 섞지 않는다.
- `.env`, `.env.backend.prod`에는 실제 비밀번호와 JWT 시크릿을 넣고 Git에 올리지 않는다.
- Postgres/Redis 외부 포트는 필요 시 방화벽으로 제한하고, TLS(HTTPS)는 nginx/certbot으로 적용한다.

## Communication

- 모든 에이전트와 도구의 응답은 반드시 한국어로 작성한다.
- 사용자가 “내가 이해되냐고 물어보면 분석과 대답만 하고, 코드 작업 등 다른 행동은 하지 말 것”이라고 요청한 경우 이 규칙을 우선 적용한다.
- 사용자가 “앱에서~”라고 하면 `mobile-web-next`를 살핀다. “모바일웹에서~”라고 해도 `mobile-web-next`를 우선 확인한다. “cms에서~”라고 하면 관리자 전용 CMS이므로 `web` 디렉터리를 확인한다.
- 사용자가 그냥 “웹에서~”라고 하면 CMS인지 사용자 모바일 웹인지 먼저 재질문해 확인한 후 작업한다.
- **API 문서화 규칙**: 새로운 화면을 만들거나 기존 화면에 API를 연동/수정하는 경우, 즉시 `docs/api_integration_status.md`에 해당 화면명·파일 경로·사용 API·연동 상태를 기록하고 유지한다.

모든 작업은 토큰 최적화하여 진행해줘.