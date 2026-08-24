import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "파일이 첨부되지 않았습니다." }, { status: 400 });
    }

    const fileName = file.name;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Try FastAPI backend first
    try {
      const fastApiFormData = new FormData();
      fastApiFormData.append("file", new Blob([buffer]), fileName);

      const fastApiRes = await fetch("http://localhost:8000/api/v1/hub/parse-excel", {
        method: "POST",
        body: fastApiFormData,
      });

      if (fastApiRes.ok) {
        const data = await fastApiRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // Continue to local fallback
    }

    // 2. Local CSV fallback parser
    const text = buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ success: false, error: "빈 파일입니다." }, { status: 400 });
    }

    const header = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const parsedRows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length < 2) continue;

      const account = cols[0] || "토스증권";
      const date = cols[1] || new Date().toISOString().slice(0, 10);
      const ticker = cols[2] || cols[0] || "AAPL";
      const name = cols[3] || ticker;
      const type = (cols[4] || "BUY").toUpperCase().includes("SELL") ? "SELL" : "BUY";
      const quantity = parseFloat(cols[5]) || 10;
      const price = parseFloat(cols[6]) || 100;
      const currency = cols[7] || (/^\d+$/.test(ticker) ? "KRW" : "USD");

      parsedRows.push({
        row_index: i,
        account,
        date,
        ticker: ticker.toUpperCase(),
        name,
        type,
        quantity,
        price,
        currency,
        total_amount: Math.round(quantity * price * 100) / 100,
        status: "VALID",
        selected: true,
      });
    }

    return NextResponse.json({
      success: true,
      file_name: fileName,
      total_rows: parsedRows.length,
      valid_rows: parsedRows.length,
      data: parsedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
