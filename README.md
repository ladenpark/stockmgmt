# Stock Management

Next.js 14와 FastAPI, PostgreSQL(또는 로컬 SQLite)로 만든 개인 주식 관리 앱입니다.

## 실행

개발 환경에서는 터미널 두 개를 사용합니다.

```bash
# 1) 백엔드
cd backend
.venv-runtime/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2) 프론트엔드 (프로젝트 루트)
npm run dev
```

브라우저는 `http://localhost:3010`, API 문서는 `http://localhost:8000/docs`에서 엽니다. `.env`의 `DATABASE_URL`을 설정하면 PostgreSQL을 사용하며, 없으면 `backend/stockmgmt.db` SQLite로 동작합니다.

## 일일 스냅샷

앱의 **데일리 손익 퍼포먼스** 화면에서 `오늘 저장`을 누르면 그 시점의 평가액을 기록합니다. 자동 실행이 필요하면 서버에서 평일 장 마감 뒤 다음 요청을 호출하도록 cron 또는 배포 플랫폼 스케줄러에 등록하세요.

```bash
curl -X POST http://localhost:8000/api/v1/daily/snapshots
```

Docker에서는 `docker compose up --build` 후 프론트엔드 `3010`, 백엔드 `8000` 포트를 사용합니다.
