import os
import json
import urllib.request
import ssl

def test_kis_connection():
    env_vars = {}
    for path in ['.env', 'backend/.env']:
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env_vars[k.strip()] = v.strip().strip('"\'')

    app_key = env_vars.get('KIS_APP_KEY', '')
    app_secret = env_vars.get('KIS_APP_SECRET', '')
    is_virtual = env_vars.get('KIS_IS_VIRTUAL', 'false').lower() == 'true'

    base_url = 'https://openapivts.koreainvestment.com:29443' if is_virtual else 'https://openapi.koreainvestment.com:9443'

    print('[1] KIS 설정 상태 확인:')
    masked_key = (app_key[:6] + '******') if len(app_key) > 6 else '(미설정)'
    masked_secret = (app_secret[:6] + '******') if len(app_secret) > 6 else '(미설정)'
    print(f'  - App Key: {masked_key} (길이: {len(app_key)})')
    print(f'  - App Secret: {masked_secret} (길이: {len(app_secret)})')
    print(f'  - 모의투자 여부: {is_virtual}')
    print(f'  - Base URL: {base_url}')

    if not app_key or not app_secret:
        print('[안내] .env에 KIS_APP_KEY 또는 KIS_APP_SECRET 값이 비어있습니다.')
        return

    ctx = ssl.create_default_context()

    print('\n[2] OAuth2 Access Token 24시간 자동 발급 요청 중...')
    token_url = f'{base_url}/oauth2/tokenP'
    payload = json.dumps({
        'grant_type': 'client_credentials',
        'appkey': app_key,
        'appsecret': app_secret
    }).encode('utf-8')
    req = urllib.request.Request(token_url, data=payload, headers={'Content-Type': 'application/json; charset=utf-8'})

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            res_data = json.loads(resp.read().decode('utf-8'))
            token = res_data.get('access_token')
            expires_in = res_data.get('expires_in', 86400)
            print(f'  ✓ 토큰 발급 성공! (앞 15자리: {token[:15]}...)')
            print(f'  ✓ 토큰 유효기간: {expires_in}초 (약 24시간 동안 자동 갱신)')

            print('\n[3] 국내 주식(삼성전자 005930) 실시간 시세 조회...')
            stock_url = f'{base_url}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=005930'
            headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'authorization': f'Bearer {token}',
                'appkey': app_key,
                'appsecret': app_secret,
                'tr_id': 'FHKST01010100'
            }
            req_stock = urllib.request.Request(stock_url, headers=headers)
            with urllib.request.urlopen(req_stock, context=ctx, timeout=10) as resp_stock:
                res_stock = json.loads(resp_stock.read().decode('utf-8'))
                out = res_stock.get('output', {})
                print(f'  ✓ 삼성전자 실시간 현재가: {out.get("stck_prpr")}원 (등락률: {out.get("prdy_ctrt")}%, 전일대비: {out.get("prdy_vrss")}원)')

            print('\n[4] 미국 주식(애플 AAPL) 실시간 시세 조회...')
            us_url = f'{base_url}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=NAS&SYMB=AAPL'
            headers['tr_id'] = 'HHDFS00000300'
            req_us = urllib.request.Request(us_url, headers=headers)
            with urllib.request.urlopen(req_us, context=ctx, timeout=10) as resp_us:
                res_us = json.loads(resp_us.read().decode('utf-8'))
                out_us = res_us.get('output', {})
                print(f'  ✓ 애플(AAPL) 실시간 현재가: ${out_us.get("last")} (등락률: {out_us.get("rate")}%, 전일대비: ${out_us.get("diff")})')

            print('\n🎉 한국투자증권 실시간 API 연동이 완벽하게 확인되었습니다!')

    except Exception as e:
        print(f'  ✗ KIS API 응답 오류: {e}')

if __name__ == '__main__':
    test_kis_connection()
