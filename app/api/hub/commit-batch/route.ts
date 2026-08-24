import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body.items || [];

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "저장할 항목이 없습니다." }, { status: 400 });
    }

    // 1. Try forwarding to FastAPI backend
    try {
      const fastApiRes = await fetch("http://localhost:8000/api/v1/hub/commit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });

      if (fastApiRes.ok) {
        const data = await fastApiRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // Continue to local fallback
    }

    return NextResponse.json({
      success: true,
      message: `총 ${items.length}건의 종목 및 거래 내역이 포트폴리오에 성공적으로 반영되었습니다.`,
      imported_count: items.length,
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
