import { WebSocket, WebSocketServer } from "ws";
import fs from "fs";
import path from "path";

// 1. .env 로드
function loadEnv() {
  const envPaths = [path.resolve(".env"), path.resolve("backend/.env")];
  const vars = {};
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...rest] = trimmed.split("=");
          vars[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
  return vars;
}

const env = loadEnv();
const appKey = env.KIS_APP_KEY || env.KIS_APPKEY || "";
const appSecret = env.KIS_APP_SECRET || env.KIS_APPSECRET || "";
const isVirtual = (env.KIS_IS_VIRTUAL || "false").toLowerCase() === "true";

const httpBaseUrl = isVirtual
  ? "https://openapivts.koreainvestment.com:29443"
  : "https://openapi.koreainvestment.com:9443";
const wsBaseUrl = isVirtual
  ? "ws://ops.koreainvestment.com:31000"
  : "ws://ops.koreainvestment.com:21000";

console.log("[KIS WS Relay] 시작 중...");
console.log(`  - AppKey 설정 여부: ${Boolean(appKey)}`);
console.log(`  - KIS WS 서버: ${wsBaseUrl}`);

// 2. Local WebSocket Server for Frontend on port 8001
const wss = new WebSocketServer({ port: 8001, host: "0.0.0.0" });
console.log("  - 프론트엔드 전용 웹소켓 서버 대기중: ws://localhost:8001");

const clients = new Set();
wss.on("connection", (client) => {
  clients.add(client);
  console.log(`[Frontend WS] 클라이언트 접속 (총 연결: ${clients.size})`);
  client.on("close", () => {
    clients.delete(client);
    console.log(`[Frontend WS] 클라이언트 연결 해제 (남은 연결: ${clients.size})`);
  });
});

function broadcast(data) {
  const msg = JSON.stringify({ type: "TICK", data });
  for (const c of clients) {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  }
}

// 3. Approval Key 발급
async function getApprovalKey() {
  if (!appKey || !appSecret) return null;
  try {
    const res = await fetch(`${httpBaseUrl}/oauth2/Approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        secretkey: appSecret,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log("  ✓ KIS Approval Key 발급 성공!");
      return data.approval_key;
    }
  } catch (err) {
    console.error("  ✗ Approval Key 발급 오류:", err);
  }
  return null;
}

// 4. KIS 실시간 틱 데이터 파싱
function parseKisTick(raw) {
  try {
    if (raw.startsWith("{")) {
      const json = JSON.parse(raw);
      if (json?.header?.tr_id === "PINGPONG") {
        return { isPing: true };
      }
      return null;
    }

    const parts = raw.split("|");
    if (parts.length < 4) return null;

    const trId = parts[1];
    const fields = parts[3].split("^");

    // 국내 주식 실시간 체결가 (H0STCNT0)
    if (trId === "H0STCNT0" && fields.length >= 13) {
      const ticker = fields[0];
      const time = fields[1];
      const currentPrice = parseFloat(fields[2]);
      const sign = fields[3];
      let changeAmount = parseFloat(fields[4]);
      if (sign === "4" || sign === "5") changeAmount = -changeAmount;
      const changePercent = parseFloat(fields[5]);

      return {
        ticker,
        market: "KR",
        currency: "KRW",
        currentPrice,
        changeAmount,
        changePercent,
        time,
        tickType: sign === "1" || sign === "2" ? "UP" : sign === "4" || sign === "5" ? "DOWN" : "FLAT",
      };
    }

    // 미국 주식 실시간 체결가 (HDFSCNT0 / HDFSASP0)
    if ((trId === "HDFSCNT0" || trId === "HDFSASP0") && fields.length >= 10) {
      const rawTicker = fields[0];
      const ticker = rawTicker.length > 4 ? rawTicker.slice(4) : rawTicker;
      const currentPrice = parseFloat(fields[11] || fields[1]);
      const changeAmount = parseFloat(fields[12] || fields[2]);
      const changePercent = parseFloat(fields[13] || fields[3]);

      return {
        ticker,
        market: "US",
        currency: "USD",
        currentPrice,
        changeAmount,
        changePercent,
        time: "",
        tickType: changeAmount >= 0 ? "UP" : "DOWN",
      };
    }
  } catch {
    // ignore parse error
  }
  return null;
}

// 5. KIS WebSocket 스트림 연결 및 구독
const targetTickers = ["005930", "AAPL", "NVDA", "TSLA", "MSFT", "PLTR"];

async function startKisStream() {
  while (true) {
    try {
      const approvalKey = await getApprovalKey();
      if (!approvalKey) {
        console.warn("[KIS WS] Approval Key 발급 대기 중... 5초 후 재시도");
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      console.log(`[KIS WS] KIS 웹소켓 서버 접속 중 -> ${wsBaseUrl}`);
      const kisWs = new WebSocket(wsBaseUrl);

      await new Promise((resolve, reject) => {
        kisWs.on("open", () => {
          console.log("🎉 [KIS WS] 한국투자증권 실시간 웹소켓 연결 성공!");

          // 종목 구독 등록
          for (const ticker of targetTickers) {
            const isKr = /^[0-9]+$/.test(ticker);
            const trId = isKr ? "H0STCNT0" : "HDFSCNT0";
            const trKey = isKr ? ticker : `DNAS${ticker.toUpperCase()}`;

            kisWs.send(
              JSON.stringify({
                header: {
                  approval_key: approvalKey,
                  custtype: "P",
                  tr_type: "1",
                  "content-type": "utf-8",
                },
                body: {
                  input: {
                    tr_id: trId,
                    tr_key: trKey,
                  },
                },
              })
            );
            console.log(`  ✓ 실시간 틱 구독: ${ticker} (${trId})`);
          }
          resolve();
        });

        kisWs.on("message", (msg) => {
          const str = msg.toString();
          const tick = parseKisTick(str);
          if (tick) {
            if (tick.isPing) {
              kisWs.send(str); // PING 응답
            } else {
              broadcast(tick);
            }
          }
        });

        kisWs.on("error", (err) => {
          console.warn("[KIS WS] 소켓 오류:", err.message);
          reject(err);
        });

        kisWs.on("close", () => {
          console.warn("[KIS WS] 연결 종료됨. 3초 후 재연결 시도...");
          resolve();
        });
      });
    } catch (err) {
      console.warn("[KIS WS] 접속 실패:", err.message);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

startKisStream();
