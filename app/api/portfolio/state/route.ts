import { NextResponse } from "next/server";

/** 포트폴리오는 FastAPI DB에서만 관리합니다. */
export async function GET() {
  return NextResponse.json(
    { success: false, error: "이 엔드포인트는 폐기되었습니다. /api/backend/portfolio/holdings를 사용하세요." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "포트폴리오는 FastAPI 거래 API를 통해서만 변경할 수 있습니다." },
    { status: 410 }
  );
}
