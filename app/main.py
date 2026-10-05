import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
app=FastAPI(title='Indian Algo Trader - Paper')
capital=float(os.getenv('INITIAL_CAPITAL','10000'))
mode=os.getenv('TRADING_MODE','PAPER')
live=os.getenv('LIVE_TRADING_ENABLED','false').lower()=='true'
@app.get('/health')
def health(): return {'status':'ok','mode':mode,'live_enabled':live}
@app.get('/api/status')
def status(): return {'capital':capital,'today_pnl':0,'position':'FLAT','trades_today':0,'daily_loss_limit':capital*0.01,'system_status':'PAPER','broker_connection':'NOT_CONFIGURED'}
@app.post('/api/kill')
def kill(): return {'ok':True,'status':'SAFE_MODE'}
@app.get('/',response_class=HTMLResponse)
def dashboard():
 return '''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Indian Algo Trader</title><style>body{font-family:system-ui;background:#0b1020;color:#fff;margin:0}.wrap{max-width:900px;margin:auto;padding:20px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{background:#141b2d;border:1px solid #26304a;border-radius:14px;padding:16px}.v{font-size:24px;font-weight:700;margin-top:6px}.danger{background:#b42318;color:#fff;border:0;border-radius:10px;padding:14px;width:100%;font-weight:700}</style><div class="wrap"><h1>Indian Algo Trader</h1><p>PAPER TRADING ONLY • Live orders disabled</p><div id="g" class="grid"></div><br><button class="danger" onclick="fetch('/api/kill',{method:'POST'}).then(load)">STOP TRADING — KILL SWITCH</button></div><script>async function load(){let x=await fetch('/api/status').then(r=>r.json());let a=[['CAPITAL','₹'+x.capital],['TODAY P&L','₹'+x.today_pnl],['POSITION',x.position],['TRADES TODAY',x.trades_today],['DAILY LOSS LIMIT','₹'+x.daily_loss_limit],['SYSTEM STATUS',x.system_status],['BROKER',x.broker_connection]];document.getElementById('g').innerHTML=a.map(z=>'<div class="card"><small>'+z[0]+'</small><div class="v">'+z[1]+'</div></div>').join('')}load()</script>'''
