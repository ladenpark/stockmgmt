// Master Stock Dictionary & Korean Chosung Search Engine

export interface MasterStockItem {
  ticker: string;
  name: string;
  nameEn?: string;
  market: "KR" | "US";
  currency: "KRW" | "USD";
  category?: string;
  aliases?: string[];
}

export const MASTER_STOCKS: MasterStockItem[] = [
  // 1. 주요 국내 대표주 & 인기주
  { ticker: "005930", name: "삼성전자", nameEn: "Samsung Electronics", market: "KR", currency: "KRW", category: "반도체/IT", aliases: ["삼전", "삼성"] },
  { ticker: "005935", name: "삼성전자우", nameEn: "Samsung Electronics Pref", market: "KR", currency: "KRW", category: "우선주", aliases: ["삼전우"] },
  { ticker: "000660", name: "SK하이닉스", nameEn: "SK Hynix", market: "KR", currency: "KRW", category: "반도체/IT", aliases: ["하이닉스", "하닉", "에스케이하이닉스"] },
  { ticker: "373220", name: "LG에너지솔루션", nameEn: "LG Energy Solution", market: "KR", currency: "KRW", category: "2차전지", aliases: ["엔솔", "엘지에너지솔루션"] },
  { ticker: "207940", name: "삼성바이오로직스", nameEn: "Samsung Biologics", market: "KR", currency: "KRW", category: "바이오", aliases: ["삼바"] },
  { ticker: "005380", name: "현대차", nameEn: "Hyundai Motor", market: "KR", currency: "KRW", category: "자동차", aliases: ["현대자동차"] },
  { ticker: "000270", name: "기아", nameEn: "Kia", market: "KR", currency: "KRW", category: "자동차", aliases: ["기아차"] },
  { ticker: "068270", name: "셀트리온", nameEn: "Celltrion", market: "KR", currency: "KRW", category: "바이오", aliases: ["셀트"] },
  { ticker: "005490", name: "POSCO홀딩스", nameEn: "POSCO Holdings", market: "KR", currency: "KRW", category: "철강/소재", aliases: ["포스코", "포스코홀딩스"] },
  { ticker: "035420", name: "NAVER", nameEn: "Naver", market: "KR", currency: "KRW", category: "플랫폼/인터넷", aliases: ["네이버"] },
  { ticker: "035720", name: "카카오", nameEn: "Kakao", market: "KR", currency: "KRW", category: "플랫폼/인터넷", aliases: ["kakao"] },
  { ticker: "051910", name: "LG화학", nameEn: "LG Chem", market: "KR", currency: "KRW", category: "화학/2차전지", aliases: ["엘지화학"] },
  { ticker: "006400", name: "삼성SDI", nameEn: "Samsung SDI", market: "KR", currency: "KRW", category: "2차전지", aliases: ["삼성에스디아이"] },
  { ticker: "105560", name: "KB금융", nameEn: "KB Financial", market: "KR", currency: "KRW", category: "금융/은행", aliases: ["국민은행", "케이비금융"] },
  { ticker: "055550", name: "신한지주", nameEn: "Shinhan Financial", market: "KR", currency: "KRW", category: "금융/은행", aliases: ["신한은행", "신한금융"] },
  { ticker: "086520", name: "에코프로", nameEn: "Ecopro", market: "KR", currency: "KRW", category: "2차전지", aliases: [] },
  { ticker: "247540", name: "에코프로비엠", nameEn: "Ecopro BM", market: "KR", currency: "KRW", category: "2차전지", aliases: [] },
  { ticker: "032830", name: "삼성생명", nameEn: "Samsung Life", market: "KR", currency: "KRW", category: "금융/보험", aliases: [] },
  { ticker: "015760", name: "한국전력", nameEn: "KEPCO", market: "KR", currency: "KRW", category: "전력/유틸리티", aliases: ["한전"] },
  { ticker: "003550", name: "LG", nameEn: "LG Corp", market: "KR", currency: "KRW", category: "지주사", aliases: ["엘지"] },
  { ticker: "017670", name: "SK텔레콤", nameEn: "SK Telecom", market: "KR", currency: "KRW", category: "통신", aliases: ["스크텔", "에스케이텔레콤"] },
  { ticker: "030200", name: "KT", nameEn: "KT Corp", market: "KR", currency: "KRW", category: "통신", aliases: ["케이티"] },
  { ticker: "034020", name: "두산에너빌리티", nameEn: "Doosan Enerbility", market: "KR", currency: "KRW", category: "원전/에너지", aliases: ["두산중공업"] },
  { ticker: "012330", name: "현대모비스", nameEn: "Hyundai Mobis", market: "KR", currency: "KRW", category: "자동차부품", aliases: ["모비스"] },
  { ticker: "042700", name: "한미반도체", nameEn: "Hanmi Semiconductor", market: "KR", currency: "KRW", category: "반도체장비", aliases: [] },
  { ticker: "009150", name: "삼성전기", nameEn: "Samsung Electro-Mechanics", market: "KR", currency: "KRW", category: "전자부품", aliases: [] },

  // 2. 주요 미국 빅테크, AI, 배당주 & ETF
  { ticker: "AAPL", name: "애플", nameEn: "Apple Inc.", market: "US", currency: "USD", category: "빅테크/IT", aliases: ["apple", "아이폰"] },
  { ticker: "NVDA", name: "엔비디아", nameEn: "NVIDIA Corp", market: "US", currency: "USD", category: "AI/반도체", aliases: ["nvidia", "엔비", "젠슨황"] },
  { ticker: "TSLA", name: "테슬라", nameEn: "Tesla Inc", market: "US", currency: "USD", category: "전기차/AI", aliases: ["tesla", "일론머스크"] },
  { ticker: "MSFT", name: "마이크로소프트", nameEn: "Microsoft Corp", market: "US", currency: "USD", category: "빅테크/클라우드", aliases: ["microsoft", "마소"] },
  { ticker: "AMZN", name: "아마존", nameEn: "Amazon.com Inc", market: "US", currency: "USD", category: "이커머스/클라우드", aliases: ["amazon", "아마존닷컴"] },
  { ticker: "GOOGL", name: "알파벳 Class A (구글)", nameEn: "Alphabet Inc Class A", market: "US", currency: "USD", category: "빅테크/검색", aliases: ["구글", "google", "알파벳"] },
  { ticker: "GOOG", name: "알파벳 Class C (구글)", nameEn: "Alphabet Inc Class C", market: "US", currency: "USD", category: "빅테크/검색", aliases: ["구글", "google"] },
  { ticker: "META", name: "메타 (페이스북)", nameEn: "Meta Platforms", market: "US", currency: "USD", category: "빅테크/SNS", aliases: ["facebook", "페이스북", "인스타그램"] },
  { ticker: "PLTR", name: "팔란티어", nameEn: "Palantir Technologies", market: "US", currency: "USD", category: "AI/빅데이터", aliases: ["palantir", "피터틸"] },
  { ticker: "IONQ", name: "아이온큐", nameEn: "IonQ Inc", market: "US", currency: "USD", category: "양자컴퓨터", aliases: ["ionq", "양자컴"] },
  { ticker: "AMD", name: "AMD (어드밴스드 마이크로)", nameEn: "Advanced Micro Devices", market: "US", currency: "USD", category: "반도체", aliases: ["리사수", "라데온"] },
  { ticker: "TSM", name: "TSMC", nameEn: "Taiwan Semiconductor", market: "US", currency: "USD", category: "반도체 파운드리", aliases: ["티에스엠씨", "대만반도체"] },
  { ticker: "AVGO", name: "브로드컴", nameEn: "Broadcom Inc", market: "US", currency: "USD", category: "반도체/네트워크", aliases: ["broadcom"] },
  { ticker: "ARM", name: "ARM 홀딩스", nameEn: "Arm Holdings plc", market: "US", currency: "USD", category: "반도체 설계", aliases: ["암홀딩스"] },
  { ticker: "SMCI", name: "슈퍼마이크로컴퓨터", nameEn: "Super Micro Computer", market: "US", currency: "USD", category: "AI서버", aliases: ["슈마컴"] },
  { ticker: "NFLX", name: "넷플릭스", nameEn: "Netflix Inc", market: "US", currency: "USD", category: "OTT/엔터", aliases: ["netflix"] },
  { ticker: "COIN", name: "코인베이스", nameEn: "Coinbase Global", market: "US", currency: "USD", category: "가상자산 거래소", aliases: ["비트코인"] },
  { ticker: "MSTR", name: "마이크로스트래티지", nameEn: "MicroStrategy Inc", market: "US", currency: "USD", category: "비트코인 보유사", aliases: ["마스텔"] },
  { ticker: "QCOM", name: "퀄컴", nameEn: "QUALCOMM Inc", market: "US", currency: "USD", category: "통신반도체", aliases: ["스냅드래곤"] },
  { ticker: "INTC", name: "인텔", nameEn: "Intel Corp", market: "US", currency: "USD", category: "반도체", aliases: ["intel"] },
  { ticker: "MU", name: "마이크론", nameEn: "Micron Technology", market: "US", currency: "USD", category: "메모리반도체", aliases: ["micron"] },
  { ticker: "ASML", name: "ASML 홀딩", nameEn: "ASML Holding NV", market: "US", currency: "USD", category: "노광장비", aliases: ["에이에스엠엘"] },

  // 3. 주요 미국 배당주 & 배당성장
  { ticker: "SCHD", name: "슈왑 미국 배당 다우존스 (SCHD)", nameEn: "Schwab US Dividend Equity ETF", market: "US", currency: "USD", category: "배당 ETF", aliases: ["슈드", "슈왑배당"] },
  { ticker: "JEPI", name: "JPMorgan 고배당 커버드콜 (JEPI)", nameEn: "JPMorgan Equity Premium Income ETF", market: "US", currency: "USD", category: "월배당 ETF", aliases: ["제피", "제이피"] },
  { ticker: "JEPQ", name: "JPMorgan 나스닥 커버드콜 (JEPQ)", nameEn: "JPMorgan Nasdaq Equity Premium ETF", market: "US", currency: "USD", category: "월배당 ETF", aliases: ["제피큐"] },
  { ticker: "O", name: "리얼티인컴 (O)", nameEn: "Realty Income Corp", market: "US", currency: "USD", category: "월배당 리츠", aliases: ["리얼티", "월배당"] },
  { ticker: "KO", name: "코카콜라", nameEn: "Coca-Cola Co", market: "US", currency: "USD", category: "소비재/배당킹", aliases: ["coca cola", "콜라", "워렌버핏"] },
  { ticker: "PEP", name: "펩시코", nameEn: "PepsiCo Inc", market: "US", currency: "USD", category: "소비재/배당", aliases: ["pepsi", "펩시"] },
  { ticker: "JNJ", name: "존슨앤드존슨", nameEn: "Johnson & Johnson", market: "US", currency: "USD", category: "헬스케어/배당킹", aliases: ["jnj"] },
  { ticker: "PG", name: "프록터 앤 갬블 (P&G)", nameEn: "Procter & Gamble", market: "US", currency: "USD", category: "소비재/배당킹", aliases: ["피앤지", "생필품"] },
  { ticker: "MCD", name: "맥도날드", nameEn: "McDonald's Corp", market: "US", currency: "USD", category: "외식/배당", aliases: ["맥날"] },
  { ticker: "SBUX", name: "스타벅스", nameEn: "Starbucks Corp", market: "US", currency: "USD", category: "카페/외식", aliases: ["스벅"] },
  { ticker: "DIS", name: "월트 디즈니", nameEn: "Walt Disney Co", market: "US", currency: "USD", category: "엔터/미디어", aliases: ["디즈니"] },
  { ticker: "NKE", name: "나이키", nameEn: "Nike Inc", market: "US", currency: "USD", category: "스포츠웨어", aliases: ["nike"] },

  // 4. 주요 지수 & 레버리지 ETF
  { ticker: "SPY", name: "SPDR S&P 500 ETF (SPY)", nameEn: "SPDR S&P 500 ETF Trust", market: "US", currency: "USD", category: "지수 ETF", aliases: ["스파이", "s&p500"] },
  { ticker: "VOO", name: "Vanguard S&P 500 (VOO)", nameEn: "Vanguard S&P 500 ETF", market: "US", currency: "USD", category: "지수 ETF", aliases: ["뱅가드"] },
  { ticker: "IVV", name: "iShares Core S&P 500 (IVV)", nameEn: "iShares Core S&P 500 ETF", market: "US", currency: "USD", category: "지수 ETF", aliases: [] },
  { ticker: "QQQ", name: "Invesco QQQ 나스닥100 (QQQ)", nameEn: "Invesco QQQ Trust", market: "US", currency: "USD", category: "나스닥 ETF", aliases: ["큐큐큐", "나스닥100"] },
  { ticker: "TQQQ", name: "ProShares UltraPro QQQ 3X (TQQQ)", nameEn: "ProShares UltraPro QQQ", market: "US", currency: "USD", category: "3배 레버리지", aliases: ["티큐", "티큐큐큐", "나스닥3배"] },
  { ticker: "SOXX", name: "iShares 반도체 ETF (SOXX)", nameEn: "iShares Semiconductor ETF", market: "US", currency: "USD", category: "반도체 ETF", aliases: ["속스"] },
  { ticker: "SOXL", name: "Direxion 반도체 불 3X (SOXL)", nameEn: "Direxion Daily Semiconductor Bull 3X", market: "US", currency: "USD", category: "3배 레버리지", aliases: ["속슬", "반도체3배"] },
  { ticker: "SQQQ", name: "ProShares UltraPro Short QQQ (SQQQ)", nameEn: "ProShares UltraPro Short QQQ", market: "US", currency: "USD", category: "인버스 3X", aliases: ["숏큐", "나스닥인버스"] },
  { ticker: "TLT", name: "iShares 20년 이상 미국채 (TLT)", nameEn: "iShares 20+ Year Treasury Bond ETF", market: "US", currency: "USD", category: "미국 장기채", aliases: ["미국채", "채권"] },
  { ticker: "TMF", name: "Direxion 20년 이상 미국채 불 3X (TMF)", nameEn: "Direxion Daily 20+ Year Treasury Bull 3X", market: "US", currency: "USD", category: "채권 3배", aliases: ["티엠에프", "채권3배"] },
];

const CHOSUNG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];

// 한글 문자열에서 초성만 추출하는 함수
export function extractChosung(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const chosungIndex = Math.floor((code - 0xac00) / 588);
      result += CHOSUNG_LIST[chosungIndex];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

// 스마트 통합 검색 함수 (티커, 국문명, 영문명, 별칭, 초성 일치 판별)
export function searchStocks(query: string, limit: number = 10): MasterStockItem[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return MASTER_STOCKS.slice(0, limit);

  const cleanChosungQ = extractChosung(cleanQ);
  const isOnlyChosung = /^[ㄱ-ㅎ]+$/.test(cleanQ);

  const scoredResults: { item: MasterStockItem; score: number }[] = [];

  for (const item of MASTER_STOCKS) {
    const ticker = item.ticker.toLowerCase();
    const name = item.name.toLowerCase();
    const nameEn = (item.nameEn || "").toLowerCase();
    const nameChosung = extractChosung(item.name);
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());

    let score = 0;

    // 1. 티커 완전 일치 (최고 우선순위)
    if (ticker === cleanQ) {
      score += 100;
    } else if (ticker.startsWith(cleanQ)) {
      score += 60;
    } else if (ticker.includes(cleanQ)) {
      score += 30;
    }

    // 2. 종목명 완전/접두 일치
    if (name === cleanQ || nameEn === cleanQ) {
      score += 90;
    } else if (name.startsWith(cleanQ) || nameEn.startsWith(cleanQ)) {
      score += 50;
    } else if (name.includes(cleanQ) || nameEn.includes(cleanQ)) {
      score += 35;
    }

    // 3. 별칭 (삼전, 하닉, 속슬, 티큐 등)
    if (aliases.some((a) => a === cleanQ)) {
      score += 85;
    } else if (aliases.some((a) => a.includes(cleanQ))) {
      score += 40;
    }

    // 4. 초성 검색 (ㅅㅅㅈㅈ -> 삼성전자, ㅇㅍ -> 애플, ㅌㅅㄹ -> 테슬라)
    if (isOnlyChosung) {
      if (nameChosung.startsWith(cleanChosungQ)) {
        score += 70;
      } else if (nameChosung.includes(cleanChosungQ)) {
        score += 45;
      }
    }

    if (score > 0) {
      scoredResults.push({ item, score });
    }
  }

  // 점수 높은 순으로 정렬 후 상위 N개 반환
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, limit).map((r) => r.item);
}
