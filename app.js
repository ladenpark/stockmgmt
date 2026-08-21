/**
 * Alexandria Stock Management Application Logic
 * Comprehensive interactive prototype supporting all flows in planning.md
 */

// Application State
const state = {
    currency: 'KRW', // 'KRW' or 'USD'
    usdRate: 1385.5,
    activeTab: 'tab-home',
    currentStockId: 'AAPL',
    whatIfMode: 'divested', // 'divested' or 'virtual'
    analysisSubView: 'dividend', // 'dividend', 'profit', 'tax', 'trend', 'weight'
    weightCategory: 'stocks', // 'stocks', 'assets', 'accounts'
    trendPeriod: '1Y',
    
    // Keypad Modal State
    keypad: {
        active: false,
        type: 'buy', // 'buy', 'sell', 'dividend'
        mode: 'unit', // 'unit' (수량·단가) or 'total' (총 거래액)
        stockId: 'AAPL',
        editTxId: null,
        activeField: 'quantity', // 'quantity', 'price', 'total'
        quantity: '10',
        price: '192.42',
        total: '1924.20',
        date: new Date().toISOString().split('T')[0],
        time: '15:30',
        brokerage: 'Fidelity'
    },

    // Portfolio Data
    stocks: [
        {
            id: 'AAPL',
            name: '애플',
            nameEn: 'Apple Inc.',
            ticker: 'AAPL',
            market: 'US',
            assetType: 'stock',
            category: '테크놀로지',
            currentPriceUsd: 192.42,
            changePct: 1.25,
            changeUsd: 2.38,
            shares: 80,
            avgPriceUsd: 181.875,
            realizedGainUsd: 3200.0,
            holdings: [
                { id: 'h1', brokerage: 'Fidelity', shares: 50, avgPriceUsd: 180.0 },
                { id: 'h2', brokerage: '카카오페이증권', shares: 30, avgPriceUsd: 185.0 }
            ],
            transactions: [
                { id: 't1', type: '매수', date: '2024.05.15', shares: 30, priceUsd: 185.0, brokerage: '카카오페이증권', returnPct: 4.01 },
                { id: 't2', type: '매수', date: '2024.03.10', shares: 50, priceUsd: 180.0, brokerage: 'Fidelity', returnPct: 6.90 },
                { id: 't3', type: '배당', date: '2024.02.15', shares: 80, priceUsd: 0.24, brokerage: 'Fidelity', returnPct: 0 }
            ]
        },
        {
            id: 'NVDA',
            name: '엔비디아',
            nameEn: 'NVIDIA Corporation',
            ticker: 'NVDA',
            market: 'US',
            assetType: 'stock',
            category: '반도체 / AI',
            currentPriceUsd: 945.50,
            changePct: 3.42,
            changeUsd: 31.20,
            shares: 45,
            avgPriceUsd: 680.00,
            realizedGainUsd: 8500.0,
            holdings: [
                { id: 'h3', brokerage: '토스증권', shares: 30, avgPriceUsd: 650.0 },
                { id: 'h4', brokerage: '미래에셋증권', shares: 15, avgPriceUsd: 740.0 }
            ],
            transactions: [
                { id: 't4', type: '매수', date: '2024.04.12', shares: 15, priceUsd: 740.0, brokerage: '미래에셋증권', returnPct: 27.77 },
                { id: 't5', type: '매수', date: '2024.01.18', shares: 30, priceUsd: 650.0, brokerage: '토스증권', returnPct: 45.46 }
            ]
        },
        {
            id: 'MSFT',
            name: '마이크로소프트',
            nameEn: 'Microsoft Corp.',
            ticker: 'MSFT',
            market: 'US',
            assetType: 'stock',
            category: '소프트웨어 / 클라우드',
            currentPriceUsd: 428.15,
            changePct: -0.45,
            changeUsd: -1.95,
            shares: 40,
            avgPriceUsd: 390.00,
            realizedGainUsd: 1450.0,
            holdings: [
                { id: 'h5', brokerage: 'Fidelity', shares: 40, avgPriceUsd: 390.0 }
            ],
            transactions: [
                { id: 't6', type: '매수', date: '2024.02.01', shares: 40, priceUsd: 390.0, brokerage: 'Fidelity', returnPct: 9.78 }
            ]
        },
        {
            id: '005930',
            name: '삼성전자',
            nameEn: 'Samsung Electronics',
            ticker: '005930',
            market: 'KR',
            assetType: 'stock',
            category: '국내 대형주',
            currentPriceUsd: 57.02, // 79,000 KRW
            changePct: 0.89,
            changeUsd: 0.50,
            shares: 200,
            avgPriceUsd: 52.69, // 73,000 KRW
            realizedGainUsd: 980.0,
            holdings: [
                { id: 'h6', brokerage: '미래에셋증권', shares: 200, avgPriceUsd: 52.69 }
            ],
            transactions: [
                { id: 't7', type: '매수', date: '2024.03.20', shares: 200, priceUsd: 52.69, brokerage: '미래에셋증권', returnPct: 8.22 }
            ]
        },
        {
            id: 'TSLA',
            name: '테슬라',
            nameEn: 'Tesla Inc.',
            ticker: 'TSLA',
            market: 'US',
            assetType: 'stock',
            category: '전기차 / 신에너지',
            currentPriceUsd: 178.50,
            changePct: 2.15,
            changeUsd: 3.75,
            shares: 35,
            avgPriceUsd: 195.00,
            realizedGainUsd: -450.0,
            holdings: [
                { id: 'h7', brokerage: '토스증권', shares: 35, avgPriceUsd: 195.0 }
            ],
            transactions: [
                { id: 't8', type: '매수', date: '2024.04.05', shares: 35, priceUsd: 195.0, brokerage: '토스증권', returnPct: -8.46 }
            ]
        },
        {
            id: 'O',
            name: '리얼티 인컴',
            nameEn: 'Realty Income Corp',
            ticker: 'O',
            market: 'US',
            assetType: 'stock',
            category: '월배당 리츠',
            currentPriceUsd: 54.20,
            changePct: 0.35,
            changeUsd: 0.19,
            shares: 120,
            avgPriceUsd: 52.00,
            realizedGainUsd: 420.0,
            holdings: [
                { id: 'h8', brokerage: '카카오페이증권', shares: 120, avgPriceUsd: 52.0 }
            ],
            transactions: [
                { id: 't9', type: '매수', date: '2024.01.10', shares: 120, priceUsd: 52.0, brokerage: '카카오페이증권', returnPct: 4.23 }
            ]
        }
    ],

    // Daily P&L Data (Tab 2)
    dailyData: [
        { date: '05.24', dateFull: '2024-05-24', totalUsd: 124500.00, diffUsd: 1200.00, diffPct: 0.97, summaryTag: 'AAPL, TSLA 상승', details: [
            { name: 'Apple (AAPL)', priceUsd: 192.42, diffUsd: 2.38, diffPct: 1.25, shares: 80, gainUsd: 190.40 },
            { name: 'NVIDIA (NVDA)', priceUsd: 945.50, diffUsd: 18.50, diffPct: 2.00, shares: 45, gainUsd: 832.50 },
            { name: 'Tesla (TSLA)', priceUsd: 178.50, diffUsd: 3.75, diffPct: 2.15, shares: 35, gainUsd: 131.25 }
        ]},
        { date: '05.23', dateFull: '2024-05-23', totalUsd: 123300.00, diffUsd: -450.00, diffPct: -0.36, summaryTag: 'MSFT 조정', details: [
            { name: 'Microsoft (MSFT)', priceUsd: 425.10, diffUsd: -5.20, diffPct: -1.21, shares: 40, gainUsd: -208.00 },
            { name: 'Samsung Elec (005930)', priceUsd: 56.50, diffUsd: -0.80, diffPct: -1.40, shares: 200, gainUsd: -160.00 }
        ]},
        { date: '05.22', dateFull: '2024-05-22', totalUsd: 123750.00, diffUsd: 800.00, diffPct: 0.65, summaryTag: 'NVDA 실적 랠리', details: [
            { name: 'NVIDIA (NVDA)', priceUsd: 927.00, diffUsd: 22.00, diffPct: 2.43, shares: 45, gainUsd: 990.00 }
        ]},
        { date: '05.21', dateFull: '2024-05-21', totalUsd: 122950.00, diffUsd: 150.00, diffPct: 0.12, summaryTag: '보합세 마감', details: [
            { name: 'Apple (AAPL)', priceUsd: 190.04, diffUsd: 0.80, diffPct: 0.42, shares: 80, gainUsd: 64.00 }
        ]},
        { date: '05.20', dateFull: '2024-05-20', totalUsd: 122800.00, diffUsd: -1100.00, diffPct: -0.88, summaryTag: '기술주 전반 하락', details: [
            { name: 'Tesla (TSLA)', priceUsd: 174.75, diffUsd: -6.50, diffPct: -3.58, shares: 35, gainUsd: -227.50 },
            { name: 'NVIDIA (NVDA)', priceUsd: 905.00, diffUsd: -15.00, diffPct: -1.63, shares: 45, gainUsd: -675.00 }
        ]}
    ],

    // What-If Divested Positions (Tab 3)
    whatIfDivested: [
        {
            id: 'wi-1',
            name: '엔비디아',
            ticker: 'NVDA',
            sellDate: '2023.10',
            sellPriceUsd: 450.00,
            currentPriceUsd: 945.50,
            shares: 20,
            diffPct: 110.11,
            foregoneGainUsd: 9910.00,
            tag: '최고 기회비용'
        },
        {
            id: 'wi-2',
            name: '애플',
            ticker: 'AAPL',
            sellDate: '2023.01',
            sellPriceUsd: 145.00,
            currentPriceUsd: 192.42,
            shares: 30,
            diffPct: 32.70,
            foregoneGainUsd: 1422.60,
            tag: '지속 상승'
        },
        {
            id: 'wi-3',
            name: '루시드',
            ticker: 'LCID',
            sellDate: '2023.04',
            sellPriceUsd: 8.50,
            currentPriceUsd: 3.15,
            shares: 300,
            diffPct: -62.94,
            foregoneGainUsd: -1605.00,
            tag: '손실 회피 성공 (잘 판 주식)'
        }
    ],

    // What-If Virtual Holdings (Tab 3)
    whatIfVirtual: [
        {
            id: 'wv-1',
            name: '팔란티어',
            ticker: 'PLTR',
            targetDate: '2024.01.05',
            entryPriceUsd: 16.50,
            currentPriceUsd: 25.80,
            shares: 100,
            returnPct: 56.36,
            unrealizedGainUsd: 930.00
        },
        {
            id: 'wv-2',
            name: '마이크론 테크놀로지',
            ticker: 'MU',
            targetDate: '2024.02.15',
            entryPriceUsd: 85.00,
            currentPriceUsd: 128.50,
            shares: 50,
            returnPct: 51.18,
            unrealizedGainUsd: 2175.00
        }
    ],

    // Monthly Dividend Data (Tab 4)
    monthlyDividendsUsd: [120, 180, 270, 150, 135, 255, 105, 165, 285, 120, 195, 300],
    dividendTimeline: [
        { ticker: 'MSFT', name: '마이크로소프트', payDate: '2024.05.14', exDate: '2024.04.18', amountUsd: 124.50, status: '지급완료', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDx2vDN9CQyDXSdpECTTXcyOH59wB4KtX-uHwUJKfR47Qtay6hbAS4-hSHdZI0SCdquyfp3ZeT1vEkUs9ta0B9JHogZUql9Mj9XKhRlljf9hOFi-Zfbo3_6qWVV3D7KOjhZCIB0nF52ZrE_u6I4itPHmBHXU8HrW2Asab7nYaHi7-60PNqa50DxxnRlC44s2X_xN1PmzsO9FMimAJeB-1Lyx8kCYUo9OjTetgHdr3f-UtloHIA2c2cfig' },
        { ticker: 'O', name: '리얼티 인컴', payDate: '2024.05.15', exDate: '2024.04.30', amountUsd: 45.20, status: '지급예정', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLmJFaYEHHxBSu3ryKrdHFJJvkG2xEWGQcrV1gtuwvyd5YKdpI3isbCYw_Is7hzewaULUOtzMrxjgFNT3DUeselzi2SSFVQrvXI1fWdb8VKERNeQG5ZWq4v9akwsn5qYsFLVlumJx-Qf6qW79SCybAmpj_kQ2wfvYJBHw7hpyAXIAtWQGPaKCp0Jl75CtTj71qHeWWbGK7ghaVvza2Hc_hZYhSK9rqTfdoH4Tz1KT5ApQB_cCzfBD26g' },
        { ticker: 'AAPL', name: '애플', payDate: '2024.05.16', exDate: '2024.05.10', amountUsd: 19.20, status: '지급완료', logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfCEg7fGKeV9MYZXYG3oM0kLup78Mk8eq3Yo3F0G2JRVvVWtFhp3jsETFfRDiG6kQmbPjFIqiCGiwDUdEWhxFVoSDuZvNWdOiE60zCm8odfOOq_HzNDYB2iHAs-3w-rkTgh4SZur1FTT0UdrhGxKJkCqKHQVSKcObMZC7PIUDGlYrF36-HrjEy2mWNbcR_UXsMjinFttnEuKGaBxR1rUHaKqMOBPdxz-pX4rTwOP6A3gV29nZz7yov3A' }
    ]
};

// Utilities for formatting
function formatMoney(amountUsd, forceCurrency = null) {
    const curr = forceCurrency || state.currency;
    if (curr === 'KRW') {
        const krw = Math.round(amountUsd * state.usdRate);
        return '₩' + krw.toLocaleString('ko-KR');
    } else {
        return '$' + amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function formatNumber(num, decimals = 2) {
    return num.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(pct, showPlus = true) {
    const sign = pct > 0 && showPlus ? '+' : '';
    return sign + pct.toFixed(2) + '%';
}

// Global UI Navigation
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Close stock detail if open
    const stockDetailView = document.getElementById('view-stock-detail');
    const mainView = document.getElementById('view-main');
    if (stockDetailView && mainView) {
        stockDetailView.classList.remove('active');
        mainView.classList.add('active');
    }

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        const target = el.getAttribute('data-tab');
        if (target === tabId) {
            el.classList.add('bg-gradient-to-br', 'from-primary', 'to-primary-container', 'text-on-primary', 'shadow-md');
            el.classList.remove('text-on-secondary-container', 'opacity-70');
            el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
        } else {
            el.classList.remove('bg-gradient-to-br', 'from-primary', 'to-primary-container', 'text-on-primary', 'shadow-md');
            el.classList.add('text-on-secondary-container', 'opacity-70');
            el.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
        }
    });

    // Update desktop nav active state
    document.querySelectorAll('.desktop-nav-item').forEach(el => {
        const target = el.getAttribute('data-tab');
        if (target === tabId) {
            el.classList.add('text-primary', 'font-bold');
            el.classList.remove('text-on-surface-variant');
        } else {
            el.classList.remove('text-primary', 'font-bold');
            el.classList.add('text-on-surface-variant');
        }
    });

    // Show active tab view
    document.querySelectorAll('.tab-page').forEach(page => {
        if (page.id === tabId) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Rerender subviews if applicable
    if (tabId === 'tab-analysis') {
        renderAnalysisReport();
    } else if (tabId === 'tab-whatif') {
        renderWhatIf();
    } else if (tabId === 'tab-daily') {
        renderDailyPerformance();
    } else if (tabId === 'tab-home') {
        renderPortfolioSummary();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Currency Toggle (KRW <-> USD)
function toggleCurrency(newCurr = null) {
    state.currency = newCurr ? newCurr : (state.currency === 'KRW' ? 'USD' : 'KRW');
    
    // Update currency toggle buttons
    document.querySelectorAll('.currency-toggle-krw').forEach(btn => {
        if (state.currency === 'KRW') {
            btn.className = "px-6 py-2 rounded-full bg-surface-container-lowest shadow-sm text-primary font-label text-sm font-semibold transition-all";
        } else {
            btn.className = "px-6 py-2 rounded-full text-on-surface-variant font-label text-sm hover:text-on-surface transition-all";
        }
    });
    document.querySelectorAll('.currency-toggle-usd').forEach(btn => {
        if (state.currency === 'USD') {
            btn.className = "px-6 py-2 rounded-full bg-surface-container-lowest shadow-sm text-primary font-label text-sm font-semibold transition-all";
        } else {
            btn.className = "px-6 py-2 rounded-full text-on-surface-variant font-label text-sm hover:text-on-surface transition-all";
        }
    });

    // Rerender active views
    renderPortfolioSummary();
    renderDailyPerformance();
    renderWhatIf();
    renderAnalysisReport();
    if (document.getElementById('view-stock-detail').classList.contains('active')) {
        renderStockDetail(state.currentStockId);
    }
}

// Render Tab 1: Portfolio Dashboard
function renderPortfolioSummary() {
    let totalValueUsd = 0;
    let totalInvestedUsd = 0;
    let todayGainUsd = 0;

    state.stocks.forEach(stock => {
        const val = stock.shares * stock.currentPriceUsd;
        const invested = stock.shares * stock.avgPriceUsd;
        const todayStockGain = stock.shares * stock.changeUsd;
        totalValueUsd += val;
        totalInvestedUsd += invested;
        todayGainUsd += todayStockGain;
    });

    const totalReturnUsd = totalValueUsd - totalInvestedUsd;
    const totalReturnPct = totalInvestedUsd > 0 ? (totalReturnUsd / totalInvestedUsd) * 100 : 0;
    const todayGainPct = totalValueUsd > 0 ? (todayGainUsd / (totalValueUsd - todayGainUsd)) * 100 : 0;

    const elTotalVal = document.getElementById('home-total-value');
    const elTotalReturn = document.getElementById('home-total-return');
    const elTodayGain = document.getElementById('home-today-gain');
    const elInvested = document.getElementById('home-invested');

    if (elTotalVal) elTotalVal.textContent = formatMoney(totalValueUsd);
    if (elInvested) elInvested.textContent = formatMoney(totalInvestedUsd);
    if (elTotalReturn) {
        elTotalReturn.textContent = `${formatPercent(totalReturnPct)} (${formatMoney(totalReturnUsd)})`;
        elTotalReturn.className = totalReturnPct >= 0 ? "font-body text-sm text-primary font-semibold flex items-center gap-1" : "font-body text-sm text-error font-semibold flex items-center gap-1";
    }
    if (elTodayGain) {
        elTodayGain.textContent = `${formatMoney(todayGainUsd)} (${formatPercent(todayGainPct)})`;
        elTodayGain.className = todayGainUsd >= 0 ? "text-primary font-medium" : "text-error font-medium";
    }

    // Render Stock List Cards
    const listContainer = document.getElementById('home-stock-list');
    if (listContainer) {
        listContainer.innerHTML = '';
        state.stocks.forEach(stock => {
            const stockValUsd = stock.shares * stock.currentPriceUsd;
            const stockCostUsd = stock.shares * stock.avgPriceUsd;
            const returnPct = ((stockValUsd - stockCostUsd) / stockCostUsd) * 100;
            const isPositive = returnPct >= 0;

            const card = document.createElement('div');
            card.className = "bg-surface-container-lowest rounded-2xl p-5 ghost-border card-hover cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4";
            card.onclick = () => openStockDetail(stock.id);

            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary font-headline font-bold text-lg">
                        ${stock.ticker.slice(0, 2)}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-headline font-bold text-lg text-on-surface">${stock.name}</h4>
                            <span class="font-label text-xs uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">${stock.ticker}</span>
                            <span class="font-label text-[11px] px-2 py-0.5 rounded-full ${stock.market === 'US' ? 'bg-primary-fixed/40 text-primary' : 'bg-tertiary-container/30 text-tertiary'} font-semibold">${stock.market === 'US' ? '미국' : '국내'}</span>
                        </div>
                        <p class="font-body text-xs text-on-surface-variant mt-1">${stock.shares}주 보유 • 평단 ${formatMoney(stock.avgPriceUsd)}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-surface-variant">
                    <div>
                        <div class="font-label text-xs text-on-surface-variant md:text-right">현재가</div>
                        <div class="font-headline text-lg font-bold text-on-surface md:text-right">${formatMoney(stock.currentPriceUsd)}</div>
                        <div class="text-xs ${stock.changePct >= 0 ? 'text-primary' : 'text-error'} font-medium md:text-right flex items-center md:justify-end gap-0.5">
                            <span class="material-symbols-outlined text-xs">${stock.changePct >= 0 ? 'trending_up' : 'trending_down'}</span>
                            ${formatPercent(stock.changePct)}
                        </div>
                    </div>
                    <div class="text-right pl-4 border-l border-surface-variant">
                        <div class="font-label text-xs text-on-surface-variant">평가금액</div>
                        <div class="font-headline text-lg font-bold text-on-surface">${formatMoney(stockValUsd)}</div>
                        <div class="font-body text-xs font-semibold ${isPositive ? 'text-primary' : 'text-error'}">
                            ${formatPercent(returnPct)} (${formatMoney(stockValUsd - stockCostUsd)})
                        </div>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }
}

// [P-101] Open Stock Detail View
function openStockDetail(stockId) {
    state.currentStockId = stockId;
    renderStockDetail(stockId);
    
    document.getElementById('view-main').classList.remove('active');
    document.getElementById('view-stock-detail').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close Stock Detail View (Back to Main)
function closeStockDetail() {
    document.getElementById('view-stock-detail').classList.remove('active');
    document.getElementById('view-main').classList.add('active');
    renderPortfolioSummary();
}

// Render [P-101] Stock Detail Page
function renderStockDetail(stockId) {
    const stock = state.stocks.find(s => s.id === stockId) || state.stocks[0];
    const totalValUsd = stock.shares * stock.currentPriceUsd;
    const totalCostUsd = stock.shares * stock.avgPriceUsd;
    const totalReturnUsd = totalValUsd - totalCostUsd;
    const totalReturnPct = ((totalValUsd - totalCostUsd) / totalCostUsd) * 100;
    const isGain = totalReturnPct >= 0;

    // Header & Ticker
    document.getElementById('detail-stock-name').innerHTML = `${stock.name} <span class="text-outline text-2xl md:text-3xl font-normal">(${stock.ticker})</span>`;
    document.getElementById('detail-category-badge').textContent = stock.category;
    document.getElementById('detail-current-price').textContent = formatMoney(stock.currentPriceUsd);
    
    const elChange = document.getElementById('detail-price-change');
    elChange.innerHTML = `
        <span class="material-symbols-outlined text-xl">${stock.changePct >= 0 ? 'trending_up' : 'trending_down'}</span>
        ${formatPercent(stock.changePct)} (${formatMoney(stock.changeUsd)})
    `;
    elChange.className = stock.changePct >= 0 ? "text-lg font-body text-primary font-medium flex items-center gap-1" : "text-lg font-body text-error font-medium flex items-center gap-1";

    // Summary Metrics
    document.getElementById('detail-total-value').textContent = formatMoney(totalValUsd);
    document.getElementById('detail-principal').textContent = formatMoney(totalCostUsd);
    
    const elTotalReturn = document.getElementById('detail-total-return');
    elTotalReturn.textContent = `${formatPercent(totalReturnPct)}`;
    elTotalReturn.className = isGain ? "font-headline text-3xl text-primary" : "font-headline text-3xl text-error";

    // Realized Profit Banner
    document.getElementById('detail-realized-profit').textContent = formatMoney(stock.realizedGainUsd);

    // Render Holdings (자산 탭)
    const holdingsContainer = document.getElementById('detail-holdings-list');
    if (holdingsContainer) {
        holdingsContainer.innerHTML = '';
        stock.holdings.forEach(h => {
            const hVal = h.shares * stock.currentPriceUsd;
            const hCost = h.shares * h.avgPriceUsd;
            const hReturnPct = ((hVal - hCost) / hCost) * 100;

            const row = document.createElement('div');
            row.className = "flex items-center justify-between p-5 bg-surface-container-lowest rounded-xl ghost-border hover:bg-surface-container-high transition-colors";
            row.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-on-surface-variant">
                        <span class="material-symbols-outlined">account_balance</span>
                    </div>
                    <div>
                        <h4 class="font-body font-bold text-base text-on-surface">${h.brokerage}</h4>
                        <p class="font-body text-xs text-on-surface-variant mt-0.5">평단가: ${formatMoney(h.avgPriceUsd)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-headline text-lg font-bold text-on-surface">${h.shares} 주</div>
                    <div class="font-body text-xs font-semibold ${hReturnPct >= 0 ? 'text-primary' : 'text-error'}">${formatPercent(hReturnPct)}</div>
                </div>
            `;
            holdingsContainer.appendChild(row);
        });
    }

    // Render Transactions (거래 탭)
    const txContainer = document.getElementById('detail-tx-list');
    if (txContainer) {
        txContainer.innerHTML = '';
        stock.transactions.forEach(tx => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl ghost-border hover:bg-surface-container transition-colors cursor-pointer";
            row.onclick = () => openTransactionModal(tx.type === '매수' ? 'buy' : 'sell', stock.id, tx.id);
            
            const isBuy = tx.type === '매수';
            const badgeClass = isBuy ? 'bg-primary-container/20 text-primary' : (tx.type === '매도' ? 'bg-error-container/40 text-error' : 'bg-tertiary-container/30 text-tertiary');

            row.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="font-label text-xs font-bold px-2.5 py-1 rounded-md ${badgeClass}">${tx.type}</span>
                    <div>
                        <div class="font-body text-sm font-semibold text-on-surface">${tx.date} • ${tx.brokerage}</div>
                        <div class="font-body text-xs text-on-surface-variant mt-0.5">${tx.shares}주 @ ${formatMoney(tx.priceUsd)}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="text-right">
                        <div class="font-headline text-base font-bold text-on-surface">${formatMoney(tx.shares * tx.priceUsd)}</div>
                        <div class="font-body text-[11px] text-on-surface-variant">클릭 시 수정</div>
                    </div>
                    <span class="material-symbols-outlined text-outline text-sm">edit</span>
                </div>
            `;
            txContainer.appendChild(row);
        });
    }
}

// Switch Subtabs in [P-101] Stock Detail (Assets vs Transactions)
function switchStockDetailTab(tabName) {
    const btnAssets = document.getElementById('detail-tab-assets-btn');
    const btnTx = document.getElementById('detail-tab-tx-btn');
    const viewAssets = document.getElementById('detail-tab-assets');
    const viewTx = document.getElementById('detail-tab-tx');

    if (tabName === 'assets') {
        btnAssets.className = "pb-4 font-label text-sm uppercase tracking-wider text-primary border-b-2 border-primary transition-all font-bold";
        btnTx.className = "pb-4 font-label text-sm uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-all";
        viewAssets.classList.remove('hidden');
        viewTx.classList.add('hidden');
    } else {
        btnTx.className = "pb-4 font-label text-sm uppercase tracking-wider text-primary border-b-2 border-primary transition-all font-bold";
        btnAssets.className = "pb-4 font-label text-sm uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-all";
        viewTx.classList.remove('hidden');
        viewAssets.classList.add('hidden');
    }
}

// [P-102] Keypad Transaction Modal
function openTransactionModal(type = 'buy', stockId = null, editTxId = null) {
    const stock = state.stocks.find(s => s.id === (stockId || state.currentStockId)) || state.stocks[0];
    state.keypad.type = type;
    state.keypad.stockId = stock.id;
    state.keypad.editTxId = editTxId;
    state.keypad.activeField = 'quantity';
    
    if (editTxId) {
        const tx = stock.transactions.find(t => t.id === editTxId);
        if (tx) {
            state.keypad.quantity = String(tx.shares);
            state.keypad.price = String(tx.priceUsd);
            state.keypad.total = String((tx.shares * tx.priceUsd).toFixed(2));
            state.keypad.brokerage = tx.brokerage;
            state.keypad.date = tx.date.replace(/\./g, '-');
        }
    } else {
        state.keypad.quantity = '10';
        state.keypad.price = String(stock.currentPriceUsd);
        state.keypad.total = String((10 * stock.currentPriceUsd).toFixed(2));
    }

    // Modal Header & Stock Name
    document.getElementById('modal-stock-info').textContent = `${stock.name} (${stock.ticker})`;
    document.getElementById('modal-submit-btn').textContent = editTxId ? '수정 완료하기' : '체결 내역 등록하기';
    
    setTransactionType(type);
    updateKeypadDisplay();

    // Show modal overlay
    const modal = document.getElementById('transaction-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.remove('opacity-0');
        modal.querySelector('.bottomsheet-content').classList.remove('translate-y-full');
    }, 10);
}

function closeTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    modal.querySelector('.modal-overlay').classList.add('opacity-0');
    modal.querySelector('.bottomsheet-content').classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function setTransactionType(type) {
    state.keypad.type = type;
    document.querySelectorAll('.tx-type-btn').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.className = "tx-type-btn flex-1 py-2 rounded-full font-label text-xs font-bold transition-all " + 
                (type === 'buy' ? 'bg-primary text-on-primary shadow-sm' : (type === 'sell' ? 'bg-error text-on-error shadow-sm' : 'bg-tertiary text-on-tertiary shadow-sm'));
        } else {
            btn.className = "tx-type-btn flex-1 py-2 rounded-full font-label text-xs text-on-surface-variant hover:text-on-surface transition-all";
        }
    });
}

function setKeypadMode(mode) {
    state.keypad.mode = mode;
    const btnUnit = document.getElementById('keypad-mode-unit');
    const btnTotal = document.getElementById('keypad-mode-total');
    if (mode === 'unit') {
        btnUnit.className = "px-4 py-1.5 rounded-full bg-surface-container-lowest text-primary font-label text-xs font-semibold shadow-xs";
        btnTotal.className = "px-4 py-1.5 rounded-full text-on-surface-variant font-label text-xs hover:text-on-surface";
        setActiveKeypadField('quantity');
    } else {
        btnTotal.className = "px-4 py-1.5 rounded-full bg-surface-container-lowest text-primary font-label text-xs font-semibold shadow-xs";
        btnUnit.className = "px-4 py-1.5 rounded-full text-on-surface-variant font-label text-xs hover:text-on-surface";
        setActiveKeypadField('total');
    }
}

function setActiveKeypadField(field) {
    state.keypad.activeField = field;
    document.getElementById('input-field-qty').classList.toggle('ring-2', field === 'quantity');
    document.getElementById('input-field-qty').classList.toggle('ring-primary', field === 'quantity');
    document.getElementById('input-field-price').classList.toggle('ring-2', field === 'price');
    document.getElementById('input-field-price').classList.toggle('ring-primary', field === 'price');
    document.getElementById('input-field-total').classList.toggle('ring-2', field === 'total');
    document.getElementById('input-field-total').classList.toggle('ring-primary', field === 'total');
}

function handleKeypadPress(val) {
    let currentVal = state.keypad[state.keypad.activeField] || '';
    if (val === 'C') {
        currentVal = '0';
    } else if (val === 'DEL') {
        currentVal = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
    } else if (val === '.') {
        if (!currentVal.includes('.')) {
            currentVal += '.';
        }
    } else {
        if (currentVal === '0' && val !== '.') {
            currentVal = val;
        } else {
            currentVal += val;
        }
    }

    state.keypad[state.keypad.activeField] = currentVal;

    // Recalculate linked fields
    const qty = parseFloat(state.keypad.quantity) || 0;
    const price = parseFloat(state.keypad.price) || 0;
    if (state.keypad.activeField === 'quantity' || state.keypad.activeField === 'price') {
        state.keypad.total = (qty * price).toFixed(2);
    } else if (state.keypad.activeField === 'total') {
        const total = parseFloat(state.keypad.total) || 0;
        if (qty > 0) {
            state.keypad.price = (total / qty).toFixed(2);
        }
    }

    updateKeypadDisplay();
}

function updateKeypadDisplay() {
    document.getElementById('display-val-qty').textContent = state.keypad.quantity;
    document.getElementById('display-val-price').textContent = '$' + state.keypad.price;
    document.getElementById('display-val-total').textContent = '$' + state.keypad.total;
    document.getElementById('display-val-total-krw').textContent = '≈ ₩' + Math.round((parseFloat(state.keypad.total) || 0) * state.usdRate).toLocaleString('ko-KR');
}

function saveTransaction() {
    const stock = state.stocks.find(s => s.id === state.keypad.stockId);
    if (!stock) return;

    const qty = parseFloat(state.keypad.quantity) || 0;
    const price = parseFloat(state.keypad.price) || 0;
    const dateStr = state.keypad.date.replace(/-/g, '.');
    const txTypeStr = state.keypad.type === 'buy' ? '매수' : (state.keypad.type === 'sell' ? '매도' : '배당');

    if (state.keypad.editTxId) {
        const tx = stock.transactions.find(t => t.id === state.keypad.editTxId);
        if (tx) {
            tx.shares = qty;
            tx.priceUsd = price;
            tx.type = txTypeStr;
            tx.date = dateStr;
        }
        showToast('거래 내역이 성공적으로 수정되었습니다.');
    } else {
        const newTx = {
            id: 't_' + Date.now(),
            type: txTypeStr,
            date: dateStr,
            shares: qty,
            priceUsd: price,
            brokerage: state.keypad.brokerage,
            returnPct: 0
        };
        stock.transactions.unshift(newTx);
        
        // Update stock holdings
        if (state.keypad.type === 'buy') {
            const oldTotalCost = stock.shares * stock.avgPriceUsd;
            stock.shares += qty;
            stock.avgPriceUsd = (oldTotalCost + (qty * price)) / stock.shares;
        } else if (state.keypad.type === 'sell') {
            stock.shares = Math.max(0, stock.shares - qty);
            stock.realizedGainUsd += qty * (price - stock.avgPriceUsd);
        }
        showToast(`${stock.name} ${txTypeStr} 거래가 등록되었습니다.`);
    }

    closeTransactionModal();
    renderStockDetail(stock.id);
    renderPortfolioSummary();
}

// Render Tab 2: Daily Performance (code2.html 기반)
function renderDailyPerformance() {
    const tbody = document.getElementById('daily-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    state.dailyData.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-surface-container transition-colors group cursor-pointer border-b border-surface-variant/30";
        tr.onclick = () => openDailyDetailModal(row.dateFull);

        const isPositive = row.diffUsd >= 0;
        const colorClass = isPositive ? 'text-primary' : 'text-error';
        const badgeBgClass = isPositive ? 'bg-primary-fixed/40 text-primary' : 'bg-error-container/50 text-error';

        tr.innerHTML = `
            <td class="py-5 px-6 font-semibold text-on-surface">${row.date}</td>
            <td class="py-5 px-6 text-right tabular-nums font-headline text-base text-on-surface">${formatMoney(row.totalUsd)}</td>
            <td class="py-5 px-6 text-right tabular-nums ${colorClass} font-semibold">${formatMoney(row.diffUsd)}</td>
            <td class="py-5 px-6 text-right tabular-nums">
                <span class="inline-block px-3 py-1 rounded-lg text-xs font-bold ${badgeBgClass}">
                    ${formatPercent(row.diffPct)}
                </span>
            </td>
            <td class="py-5 px-6 text-on-surface-variant font-body text-xs">
                <span class="inline-flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-md">
                    <span class="material-symbols-outlined text-xs ${colorClass}">${isPositive ? 'trending_up' : 'trending_down'}</span>
                    ${row.summaryTag}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Open [P-202] Daily Detail Bottom Sheet
function openDailyDetailModal(dateStr) {
    const item = state.dailyData.find(d => d.dateFull === dateStr) || state.dailyData[0];
    document.getElementById('daily-modal-date').textContent = `${item.dateFull} 마감 요약`;
    document.getElementById('daily-modal-total').textContent = formatMoney(item.totalUsd);
    document.getElementById('daily-modal-diff').textContent = `${formatMoney(item.diffUsd)} (${formatPercent(item.diffPct)})`;
    document.getElementById('daily-modal-diff').className = item.diffUsd >= 0 ? "font-headline text-2xl text-primary font-bold" : "font-headline text-2xl text-error font-bold";

    const listContainer = document.getElementById('daily-modal-stock-list');
    listContainer.innerHTML = '';
    (item.details || []).forEach(detail => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-4 bg-surface-container rounded-xl";
        row.innerHTML = `
            <div>
                <div class="font-headline font-bold text-sm text-on-surface">${detail.name}</div>
                <div class="font-body text-xs text-on-surface-variant mt-0.5">${detail.shares}주 보유 • 종가 ${formatMoney(detail.priceUsd)}</div>
            </div>
            <div class="text-right">
                <div class="font-headline font-bold text-sm ${detail.gainUsd >= 0 ? 'text-primary' : 'text-error'}">${formatMoney(detail.gainUsd)}</div>
                <div class="font-body text-xs ${detail.diffPct >= 0 ? 'text-primary' : 'text-error'}">${formatPercent(detail.diffPct)}</div>
            </div>
        `;
        listContainer.appendChild(row);
    });

    const modal = document.getElementById('daily-detail-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.remove('opacity-0');
        modal.querySelector('.bottomsheet-content').classList.remove('translate-y-full');
    }, 10);
}

function closeDailyDetailModal() {
    const modal = document.getElementById('daily-detail-modal');
    modal.querySelector('.modal-overlay').classList.add('opacity-0');
    modal.querySelector('.bottomsheet-content').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// Render Tab 3: What-If Simulation (code3.html 기반)
function setWhatIfMode(mode) {
    state.whatIfMode = mode;
    const btnDivested = document.getElementById('whatif-btn-divested');
    const btnVirtual = document.getElementById('whatif-btn-virtual');
    if (mode === 'divested') {
        btnDivested.className = "px-6 py-2 rounded-full font-label text-sm bg-surface-container-lowest text-primary shadow-sm transition-all font-semibold";
        btnVirtual.className = "px-6 py-2 rounded-full font-label text-sm text-on-surface-variant hover:text-primary transition-all";
        document.getElementById('whatif-divested-section').classList.remove('hidden');
        document.getElementById('whatif-virtual-section').classList.add('hidden');
    } else {
        btnVirtual.className = "px-6 py-2 rounded-full font-label text-sm bg-surface-container-lowest text-primary shadow-sm transition-all font-semibold";
        btnDivested.className = "px-6 py-2 rounded-full font-label text-sm text-on-surface-variant hover:text-primary transition-all";
        document.getElementById('whatif-virtual-section').classList.remove('hidden');
        document.getElementById('whatif-divested-section').classList.add('hidden');
    }
    renderWhatIf();
}

function renderWhatIf() {
    // Total Foregone Opportunity Cost Calculation
    let totalForegoneUsd = 0;
    state.whatIfDivested.forEach(item => {
        totalForegoneUsd += item.foregoneGainUsd;
    });

    const elTotalForegone = document.getElementById('whatif-total-foregone');
    if (elTotalForegone) {
        elTotalForegone.textContent = (totalForegoneUsd >= 0 ? '+' : '') + formatMoney(totalForegoneUsd);
    }

    // Render Divested Cards
    const divestedContainer = document.getElementById('whatif-divested-grid');
    if (divestedContainer) {
        divestedContainer.innerHTML = '';
        state.whatIfDivested.forEach(item => {
            const card = document.createElement('article');
            card.className = "bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 hover:bg-surface-container transition-colors duration-300 ghost-border cursor-pointer group";
            card.onclick = () => showToast(`${item.name} (${item.ticker}) 매도 당시 시점 차트 및 현재가 비교 완료`);

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-headline text-xl text-on-surface font-bold">${item.name} <span class="text-sm font-normal text-on-surface-variant font-label">(${item.ticker})</span></h5>
                        <span class="font-label text-on-surface-variant text-xs mt-1 block">매도일: ${item.sellDate} • ${item.shares}주 매도</span>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${item.foregoneGainUsd >= 0 ? 'bg-primary-fixed/40 text-primary' : 'bg-tertiary-container/30 text-tertiary'}">
                        ${item.tag}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-auto">
                    <div class="flex flex-col">
                        <span class="font-label text-on-surface-variant text-xs uppercase mb-1">과거 매도가</span>
                        <span class="font-body text-on-surface text-lg font-semibold">${formatMoney(item.sellPriceUsd)}</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="font-label text-on-surface-variant text-xs uppercase mb-1">현재 시장가</span>
                        <span class="font-body text-on-surface text-lg font-bold">${formatMoney(item.currentPriceUsd)}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-4 border-t border-surface-container-high">
                    <div>
                        <span class="font-label text-xs text-on-surface-variant block">미매도 시 차액</span>
                        <span class="font-headline text-base font-bold ${item.foregoneGainUsd >= 0 ? 'text-primary' : 'text-tertiary'}">${formatMoney(item.foregoneGainUsd)}</span>
                    </div>
                    <span class="font-body ${item.diffPct >= 0 ? 'text-primary' : 'text-tertiary'} font-bold text-sm bg-primary-container/20 px-3 py-1 rounded-full">
                        ${formatPercent(item.diffPct)}
                    </span>
                </div>
            `;
            divestedContainer.appendChild(card);
        });
    }

    // Render Virtual Cards
    const virtualContainer = document.getElementById('whatif-virtual-grid');
    if (virtualContainer) {
        virtualContainer.innerHTML = '';
        state.whatIfVirtual.forEach(item => {
            const card = document.createElement('article');
            card.className = "bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 hover:bg-surface-container transition-colors duration-300 ghost-border cursor-pointer group";
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-headline text-xl text-on-surface font-bold">${item.name} <span class="text-sm font-normal text-on-surface-variant font-label">(${item.ticker})</span></h5>
                        <span class="font-label text-on-surface-variant text-xs mt-1 block">모의 매수일: ${item.targetDate} • ${item.shares}주</span>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed/40 text-primary">가상 보유</span>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-auto">
                    <div class="flex flex-col">
                        <span class="font-label text-on-surface-variant text-xs uppercase mb-1">가상 매수가</span>
                        <span class="font-body text-on-surface text-lg font-semibold">${formatMoney(item.entryPriceUsd)}</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="font-label text-on-surface-variant text-xs uppercase mb-1">현재 시장가</span>
                        <span class="font-body text-on-surface text-lg font-bold">${formatMoney(item.currentPriceUsd)}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-4 border-t border-surface-container-high">
                    <div>
                        <span class="font-label text-xs text-on-surface-variant block">모의 평가손익</span>
                        <span class="font-headline text-base font-bold text-primary">${formatMoney(item.unrealizedGainUsd)}</span>
                    </div>
                    <span class="font-body text-primary font-bold text-sm bg-primary-container/20 px-3 py-1 rounded-full">
                        ${formatPercent(item.returnPct)}
                    </span>
                </div>
            `;
            virtualContainer.appendChild(card);
        });
    }
}

// Open Virtual Stock Modal (가상 종목 추가)
function openAddVirtualModal() {
    const modal = document.getElementById('virtual-stock-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeAddVirtualModal() {
    const modal = document.getElementById('virtual-stock-modal');
    modal.querySelector('.modal-overlay').classList.add('opacity-0');
    modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function saveVirtualStock() {
    const name = document.getElementById('virtual-name-input').value.trim();
    const ticker = document.getElementById('virtual-ticker-input').value.trim().toUpperCase();
    const shares = parseFloat(document.getElementById('virtual-shares-input').value) || 0;
    const price = parseFloat(document.getElementById('virtual-price-input').value) || 0;

    if (!name || !ticker || shares <= 0 || price <= 0) {
        alert('모든 필드를 올바르게 입력해주세요.');
        return;
    }

    const currentPrice = price * 1.15; // Sample simulation
    const gain = (currentPrice - price) * shares;

    state.whatIfVirtual.push({
        id: 'wv_' + Date.now(),
        name,
        ticker,
        targetDate: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        entryPriceUsd: price,
        currentPriceUsd: currentPrice,
        shares,
        returnPct: 15.0,
        unrealizedGainUsd: gain
    });

    closeAddVirtualModal();
    setWhatIfMode('virtual');
    showToast(`${name} 가상 종목이 추가되었습니다.`);
}

// Render Tab 4: Analysis Report (code4.html 5개 서브 뷰)
function switchAnalysisSubView(subViewName) {
    state.analysisSubView = subViewName;

    // Update Chip Styles
    document.querySelectorAll('.analysis-chip').forEach(btn => {
        const target = btn.getAttribute('data-subview');
        if (target === subViewName) {
            btn.className = "analysis-chip whitespace-nowrap px-6 py-2.5 rounded-full font-label text-sm font-bold bg-primary text-on-primary shadow-sm transition-all transform scale-105";
        } else {
            btn.className = "analysis-chip whitespace-nowrap px-5 py-2.5 rounded-full font-label text-sm font-medium bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors";
        }
    });

    // Show active sub-view
    document.querySelectorAll('.analysis-subview').forEach(view => {
        if (view.id === `analysis-subview-${subViewName}`) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    renderAnalysisReport();
}

function renderAnalysisReport() {
    if (state.analysisSubView === 'dividend') {
        renderDividendAnalysis();
    } else if (state.analysisSubView === 'profit') {
        renderProfitAnalysis();
    } else if (state.analysisSubView === 'tax') {
        renderTaxAnalysis();
    } else if (state.analysisSubView === 'trend') {
        renderTrendAnalysis();
    } else if (state.analysisSubView === 'weight') {
        renderWeightAnalysis();
    }
}

// Subview 1: Dividend
function renderDividendAnalysis() {
    const totalDivUsd = state.monthlyDividendsUsd.reduce((a, b) => a + b, 0);
    const divYield = 3.52;

    const elTotal = document.getElementById('dividend-total-amount');
    const elYield = document.getElementById('dividend-yield-pct');
    if (elTotal) elTotal.textContent = formatMoney(totalDivUsd);
    if (elYield) elYield.textContent = divYield.toFixed(2);

    // Monthly Bar Chart
    const barContainer = document.getElementById('dividend-bar-container');
    if (barContainer) {
        barContainer.innerHTML = '';
        const maxVal = Math.max(...state.monthlyDividendsUsd);
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        state.monthlyDividendsUsd.forEach((val, idx) => {
            const hPct = Math.round((val / maxVal) * 100);
            const isSelected = idx === 4; // May
            
            const col = document.createElement('div');
            col.className = "w-full flex flex-col items-center gap-2 z-10 group relative cursor-pointer";
            col.onclick = () => showToast(`${months[idx]} 예상 배당금: ${formatMoney(val)}`);
            
            col.innerHTML = `
                <div class="w-full ${isSelected ? 'bg-primary shadow-[0_0_15px_rgba(9,76,178,0.3)]' : 'bg-primary-container/30 group-hover:bg-primary'} rounded-t-xl transition-all animate-bar" style="height: ${hPct}%; animation-delay: ${idx * 0.04}s;"></div>
                <span class="font-label text-[11px] ${isSelected ? 'font-bold text-primary' : 'text-on-surface-variant'}">${months[idx]}</span>
            `;
            barContainer.appendChild(col);
        });
    }

    // Timeline List
    const timelineContainer = document.getElementById('dividend-timeline-list');
    if (timelineContainer) {
        timelineContainer.innerHTML = '';
        state.dividendTimeline.forEach(item => {
            const row = document.createElement('div');
            row.className = "bg-surface-container-lowest rounded-2xl p-4 flex items-center justify-between group hover:bg-surface-container-low transition-colors cursor-pointer ghost-border";
            row.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center p-2 overflow-hidden">
                        <img alt="${item.name}" class="w-full h-full object-contain" src="${item.logo}"/>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-headline font-bold text-base text-on-surface">${item.name}</span>
                        <span class="font-body text-xs text-on-surface-variant">${item.ticker} • 지급일 ${item.payDate}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="font-headline font-bold text-base text-on-surface">${formatMoney(item.amountUsd)}</span>
                    <span class="font-label text-[11px] font-semibold ${item.status === '지급완료' ? 'text-tertiary bg-tertiary-container/30' : 'text-primary bg-primary-container/30'} px-2.5 py-0.5 rounded-full mt-1">${item.status}</span>
                </div>
            `;
            timelineContainer.appendChild(row);
        });
    }
}

// Subview 2: Profit Breakdown
function renderProfitAnalysis() {
    let totalUnrealized = 0;
    let totalRealized = 0;
    let totalDividend = state.monthlyDividendsUsd.reduce((a, b) => a + b, 0);

    state.stocks.forEach(s => {
        totalUnrealized += (s.shares * s.currentPriceUsd) - (s.shares * s.avgPriceUsd);
        totalRealized += s.realizedGainUsd;
    });

    const netProfit = totalUnrealized + totalRealized + totalDividend;
    document.getElementById('profit-net-total').textContent = formatMoney(netProfit);
    document.getElementById('profit-unrealized').textContent = formatMoney(totalUnrealized);
    document.getElementById('profit-realized').textContent = formatMoney(totalRealized);
    document.getElementById('profit-dividend').textContent = formatMoney(totalDividend);
}

// Subview 3: Overseas Tax Simulator (해외주식 양도소득세)
function renderTaxAnalysis() {
    const totalRealizedGainUsd = 8500.0 + 3200.0 + 1450.0 - 450.0; // Sample 2024 total
    const totalRealizedGainKrw = Math.round(totalRealizedGainUsd * state.usdRate);
    const deductionKrw = 2500000; // 250만원 기본공제
    const taxableIncomeKrw = Math.max(0, totalRealizedGainKrw - deductionKrw);
    const estimatedTaxKrw = Math.round(taxableIncomeKrw * 0.22); // 22% (양도소득세 20% + 지방소득세 2%)

    document.getElementById('tax-realized-krw').textContent = '₩' + totalRealizedGainKrw.toLocaleString('ko-KR') + ` ($${totalRealizedGainUsd.toLocaleString()})`;
    document.getElementById('tax-deduction-krw').textContent = '- ₩' + deductionKrw.toLocaleString('ko-KR');
    document.getElementById('tax-taxable-krw').textContent = '₩' + taxableIncomeKrw.toLocaleString('ko-KR');
    document.getElementById('tax-estimated-total').textContent = '₩' + estimatedTaxKrw.toLocaleString('ko-KR');
}

// Subview 4: Trend Chart
function setTrendPeriod(period) {
    state.trendPeriod = period;
    document.querySelectorAll('.trend-period-btn').forEach(btn => {
        if (btn.getAttribute('data-period') === period) {
            btn.className = "trend-period-btn px-4 py-1.5 rounded-full bg-primary text-on-primary font-label text-xs font-bold shadow-xs";
        } else {
            btn.className = "trend-period-btn px-4 py-1.5 rounded-full text-on-surface-variant font-label text-xs hover:text-on-surface";
        }
    });
    renderTrendAnalysis();
}

function renderTrendAnalysis() {
    const points = [
        { label: '1월', principal: 100000, total: 102000 },
        { label: '2월', principal: 110000, total: 114000 },
        { label: '3월', principal: 115000, total: 121000 },
        { label: '4월', principal: 120000, total: 122800 },
        { label: '5월', principal: 120000, total: 124500 }
    ];

    const svg = document.getElementById('trend-chart-svg');
    if (!svg) return;

    const width = 600;
    const height = 240;
    const maxVal = 135000;
    const minVal = 95000;

    let pathTotal = '';
    let pathPrincipal = '';

    points.forEach((p, idx) => {
        const x = (idx / (points.length - 1)) * (width - 60) + 30;
        const yTotal = height - ((p.total - minVal) / (maxVal - minVal)) * (height - 40) - 20;
        const yPrincipal = height - ((p.principal - minVal) / (maxVal - minVal)) * (height - 40) - 20;

        if (idx === 0) {
            pathTotal += `M ${x} ${yTotal}`;
            pathPrincipal += `M ${x} ${yPrincipal}`;
        } else {
            pathTotal += ` L ${x} ${yTotal}`;
            pathPrincipal += ` L ${x} ${yPrincipal}`;
        }
    });

    svg.innerHTML = `
        <defs>
            <linearGradient id="gradTotal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#094cb2" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#094cb2" stop-opacity="0.0"/>
            </linearGradient>
        </defs>
        <!-- Horizontal Gridlines -->
        <line x1="20" y1="40" x2="580" y2="40" stroke="#e3e2e3" stroke-width="1" stroke-dasharray="4"/>
        <line x1="20" y1="120" x2="580" y2="120" stroke="#e3e2e3" stroke-width="1" stroke-dasharray="4"/>
        <line x1="20" y1="200" x2="580" y2="200" stroke="#e3e2e3" stroke-width="1" stroke-dasharray="4"/>
        
        <!-- Lines -->
        <path d="${pathPrincipal}" fill="none" stroke="#737784" stroke-width="2" stroke-dasharray="5"/>
        <path d="${pathTotal}" fill="none" stroke="#094cb2" stroke-width="3.5" stroke-linecap="round"/>
        
        <!-- Data Dots -->
        ${points.map((p, idx) => {
            const x = (idx / (points.length - 1)) * (width - 60) + 30;
            const yTotal = height - ((p.total - minVal) / (maxVal - minVal)) * (height - 40) - 20;
            return `<circle cx="${x}" cy="${yTotal}" r="5" fill="#094cb2" stroke="#ffffff" stroke-width="2"/>`;
        }).join('')}
    `;
}

// Subview 5: Asset Weight Donut Chart
function setWeightCategory(cat) {
    state.weightCategory = cat;
    document.querySelectorAll('.weight-cat-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
            btn.className = "weight-cat-btn px-5 py-2 rounded-full bg-primary text-on-primary font-label text-xs font-bold shadow-xs";
        } else {
            btn.className = "weight-cat-btn px-5 py-2 rounded-full text-on-surface-variant font-label text-xs hover:text-on-surface bg-surface-container";
        }
    });
    renderWeightAnalysis();
}

function renderWeightAnalysis() {
    let items = [];
    const colors = ['#094cb2', '#3366cc', '#bfab49', '#6d5e00', '#5a5f63', '#93000a'];

    if (state.weightCategory === 'stocks') {
        const totalVal = state.stocks.reduce((acc, s) => acc + (s.shares * s.currentPriceUsd), 0);
        items = state.stocks.map((s, idx) => {
            const val = s.shares * s.currentPriceUsd;
            return {
                name: s.name,
                ticker: s.ticker,
                valUsd: val,
                pct: (val / totalVal) * 100,
                color: colors[idx % colors.length]
            };
        }).sort((a, b) => b.valUsd - a.valUsd);
    } else if (state.weightCategory === 'assets') {
        items = [
            { name: '미국 주식', ticker: 'US Equities', valUsd: 113098, pct: 90.8, color: '#094cb2' },
            { name: '국내 주식', ticker: 'KR Equities', valUsd: 11402, pct: 9.2, color: '#bfab49' }
        ];
    } else {
        items = [
            { name: 'Fidelity', ticker: '미국 메인 계좌', valUsd: 65420, pct: 52.5, color: '#094cb2' },
            { name: '토스증권', ticker: '성장주 계좌', valUsd: 34615, pct: 27.8, color: '#3366cc' },
            { name: '카카오페이증권', ticker: '배당주 계좌', valUsd: 13063, pct: 10.5, color: '#bfab49' },
            { name: '미래에셋증권', ticker: '국내/외 종합', valUsd: 11402, pct: 9.2, color: '#6d5e00' }
        ];
    }

    // Render Donut SVG
    const svg = document.getElementById('weight-donut-svg');
    if (svg) {
        let accumulatedPct = 0;
        const circumference = 2 * Math.PI * 70; // radius = 70
        let pathsHtml = '';

        items.forEach(item => {
            const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPct / 100) * circumference);
            pathsHtml += `
                <circle cx="100" cy="100" r="70" fill="transparent"
                    stroke="${item.color}" stroke-width="28"
                    stroke-dasharray="${strokeDasharray}"
                    stroke-dashoffset="${strokeDashoffset}"
                    class="transition-all duration-500 hover:opacity-80 cursor-pointer"/>
            `;
            accumulatedPct += item.pct;
        });

        svg.innerHTML = pathsHtml;
    }

    // Render Legend & Ranking List
    const listContainer = document.getElementById('weight-ranking-list');
    if (listContainer) {
        listContainer.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between p-3.5 bg-surface-container rounded-xl";
            row.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-3.5 h-3.5 rounded-full" style="background-color: ${item.color};"></div>
                    <div>
                        <div class="font-headline font-bold text-sm text-on-surface">${item.name}</div>
                        <div class="font-label text-xs text-on-surface-variant">${item.ticker}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-headline font-bold text-sm text-on-surface">${formatMoney(item.valUsd)}</div>
                    <div class="font-label text-xs text-primary font-semibold">${item.pct.toFixed(1)}%</div>
                </div>
            `;
            listContainer.appendChild(row);
        });
    }
}

// Filter BottomSheet & Account Drawer
function openFilterBottomSheet() {
    const sheet = document.getElementById('filter-bottom-sheet');
    sheet.classList.remove('hidden');
    setTimeout(() => {
        sheet.querySelector('.modal-overlay').classList.remove('opacity-0');
        sheet.querySelector('.bottomsheet-content').classList.remove('translate-y-full');
    }, 10);
}

function closeFilterBottomSheet() {
    const sheet = document.getElementById('filter-bottom-sheet');
    sheet.querySelector('.modal-overlay').classList.add('opacity-0');
    sheet.querySelector('.bottomsheet-content').classList.add('translate-y-full');
    setTimeout(() => sheet.classList.add('hidden'), 300);
}

function openAccountDrawer() {
    const drawer = document.getElementById('account-drawer');
    drawer.classList.remove('hidden');
    setTimeout(() => {
        drawer.querySelector('.modal-overlay').classList.remove('opacity-0');
        drawer.querySelector('.drawer-content').classList.remove('-translate-x-full');
    }, 10);
}

function closeAccountDrawer() {
    const drawer = document.getElementById('account-drawer');
    drawer.querySelector('.modal-overlay').classList.add('opacity-0');
    drawer.querySelector('.drawer-content').classList.add('-translate-x-full');
    setTimeout(() => drawer.classList.add('hidden'), 300);
}

// Data Hub: Excel & PDF Simulation
function openExcelModal() {
    const modal = document.getElementById('excel-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeExcelModal() {
    const modal = document.getElementById('excel-modal');
    modal.querySelector('.modal-overlay').classList.add('opacity-0');
    modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function simulateExcelUpload() {
    const fileInput = document.getElementById('excel-file-input');
    if (!fileInput.files.length) {
        alert('업로드할 엑셀(.xlsx) 파일을 선택해주세요.');
        return;
    }
    closeExcelModal();
    showToast('엑셀 데이터(총 12건의 보유 및 체결 내역)를 성공적으로 불러왔습니다.');
    renderPortfolioSummary();
}

function openPdfModal() {
    const modal = document.getElementById('pdf-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.querySelector('.modal-overlay').classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    modal.querySelector('.modal-overlay').classList.add('opacity-0');
    modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function simulatePdfAnalysis() {
    const statusText = document.getElementById('pdf-ocr-status');
    statusText.textContent = 'Google Cloud Vision OCR 분석 중... (증권사 거래내역서 인식)';
    statusText.classList.remove('hidden');
    setTimeout(() => {
        statusText.textContent = '인식 완료: 미래에셋증권 2024년 1분기 잔고명세서 (4개 종목 추출)';
        setTimeout(() => {
            closePdfModal();
            showToast('PDF 분석 데이터가 포트폴리오에 자동 반영되었습니다.');
        }, 1200);
    }, 1500);
}

// Toast notification helper
function showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 3000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioSummary();
    renderDailyPerformance();
    renderWhatIf();
    renderAnalysisReport();
});
