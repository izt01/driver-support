// ===== API ヘルパー =====
const api = {
  async get(path, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del(path) {
    const res = await fetch(API_BASE + path, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// ===== ユーティリティ =====
const fmt = {
  yen: n => '¥' + Number(n || 0).toLocaleString(),
  date: s => s ? new Date(s).toLocaleDateString('ja-JP') : '',
  num: n => Number(n || 0).toLocaleString()
};

function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.className = 'toast', 2800);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ===== ナビゲーション =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');

  if (name === 'sales') loadSalesPage();
  if (name === 'rides') loadRidesPage();
  if (name === 'analysis') loadAnalysisPage();
  if (name === 'route') initRoutePage();
}

// ===== 売上ページ =====
let salesChart = null;
let salesChartType = 'bar';

async function loadSalesPage() {
  await loadSalesKPI();
  await loadMonthlySales();
  await loadSalesList();
}

async function loadSalesKPI() {
  try {
    const rows = await api.get('/api/sales', { start: monthStart(), end: today() });
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const days = rows.length;
    document.getElementById('kpi-month-total').textContent = fmt.yen(total);
    document.getElementById('kpi-month-days').textContent = days + '日';
    document.getElementById('kpi-month-avg').textContent = days ? fmt.yen(Math.round(total / days)) : '¥0';

    const monthly = await api.get('/api/sales/monthly');
    if (monthly.length >= 2) {
      const diff = Number(monthly[0].total) - Number(monthly[1].total);
      const el = document.getElementById('kpi-month-diff');
      el.textContent = (diff >= 0 ? '+' : '') + fmt.yen(diff);
      el.className = 'kpi-value ' + (diff >= 0 ? 'compare-diff-up' : 'compare-diff-down');
    }
  } catch (e) { console.error(e); }
}

async function loadMonthlySales() {
  try {
    const data = await api.get('/api/sales/monthly');
    const labels = data.map(d => d.month).reverse();
    const values = data.map(d => Number(d.total)).reverse();
    renderSalesChart(labels, values);
  } catch (e) { console.error(e); }
}

function renderSalesChart(labels, values) {
  const ctx = document.getElementById('salesChart').getContext('2d');
  if (salesChart) salesChart.destroy();

  const isBar = salesChartType === 'bar';
  const isLine = salesChartType === 'line';

  salesChart = new Chart(ctx, {
    type: salesChartType === 'pie' ? 'pie' : salesChartType,
    data: {
      labels,
      datasets: [{
        label: '売上',
        data: values,
        backgroundColor: salesChartType === 'pie'
          ? ['#f5c518','#3b82f6','#22c55e','#ef4444','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#fb923c','#818cf8','#34d399']
          : 'rgba(245,197,24,0.7)',
        borderColor: salesChartType === 'pie' ? '#1a1d27' : '#f5c518',
        borderWidth: salesChartType === 'pie' ? 2 : 2,
        tension: 0.4,
        fill: isLine ? 'origin' : false,
        pointBackgroundColor: '#f5c518',
        pointRadius: isLine ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: salesChartType === 'pie', labels: { color: '#e8eaf0' } },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + fmt.yen(ctx.raw)
          }
        }
      },
      scales: salesChartType === 'pie' ? {} : {
        x: { ticks: { color: '#7b8099' }, grid: { color: '#2e3248' } },
        y: { ticks: { color: '#7b8099', callback: v => '¥' + (v / 10000).toFixed(0) + '万' }, grid: { color: '#2e3248' } }
      }
    }
  });
}

async function loadSalesList() {
  try {
    const start = document.getElementById('sales-start').value || monthStart();
    const end = document.getElementById('sales-end').value || today();
    const rows = await api.get('/api/sales', { start, end });

    const tbody = document.getElementById('sales-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">データがありません</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${fmt.date(r.date)}</td>
        <td class="mono">${fmt.yen(r.amount)}</td>
        <td style="color:var(--muted)">${r.memo || '-'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteSale(${r.id})">削除</button></td>
      </tr>
    `).join('');
  } catch (e) { toast('データ取得に失敗しました', true); }
}

async function addSale() {
  const date = document.getElementById('sale-date').value;
  const amount = document.getElementById('sale-amount').value;
  const memo = document.getElementById('sale-memo').value;
  if (!date || !amount) return toast('日付と売上を入力してください', true);
  try {
    await api.post('/api/sales', { date, amount: parseInt(amount), memo });
    toast('売上を登録しました ✓');
    document.getElementById('sale-amount').value = '';
    document.getElementById('sale-memo').value = '';
    await loadSalesPage();
  } catch (e) { toast('登録に失敗しました', true); }
}

async function deleteSale(id) {
  if (!confirm('削除しますか？')) return;
  try {
    await api.del('/api/sales/' + id);
    toast('削除しました');
    await loadSalesList();
    await loadSalesKPI();
  } catch (e) { toast('削除に失敗しました', true); }
}

// 期間比較
async function comparePeriods() {
  const p1s = document.getElementById('p1-start').value;
  const p1e = document.getElementById('p1-end').value;
  const p2s = document.getElementById('p2-start').value;
  const p2e = document.getElementById('p2-end').value;
  if (!p1s || !p1e || !p2s || !p2e) return toast('全ての期間を入力してください', true);
  try {
    const data = await api.get('/api/sales/compare', {
      period1_start: p1s, period1_end: p1e,
      period2_start: p2s, period2_end: p2e
    });
    const diff = Number(data.period1.total) - Number(data.period2.total);
    const diffPct = data.period2.total ? Math.round(diff / data.period2.total * 100) : 0;
    document.getElementById('compare-result').innerHTML = `
      <div class="compare-result">
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${p1s} 〜 ${p1e}</div>
          <div class="compare-amount">${fmt.yen(data.period1.total)}</div>
          <div style="font-size:12px;color:var(--muted)">${data.period1.days}日間</div>
        </div>
        <div class="compare-vs">VS</div>
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${p2s} 〜 ${p2e}</div>
          <div class="compare-amount">${fmt.yen(data.period2.total)}</div>
          <div style="font-size:12px;color:var(--muted)">${data.period2.days}日間</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:14px">
        前期比: <span class="${diff >= 0 ? 'compare-diff-up' : 'compare-diff-down'}" style="font-weight:700;font-size:18px">
          ${diff >= 0 ? '+' : ''}${fmt.yen(diff)} (${diff >= 0 ? '+' : ''}${diffPct}%)
        </span>
      </div>
    `;
  } catch (e) { toast('比較に失敗しました', true); }
}

// ===== 乗降記録ページ =====
let geocodeCache = {};
let map, markers = [];

async function loadRidesPage() {
  document.getElementById('ride-date').value = today();
  await loadRidesList();
}

async function geocodeAddress(address) {
  if (geocodeCache[address]) return geocodeCache[address];
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    const components = data.results[0].address_components;

    // 市区町村を取得
    let region = '';
    for (const c of components) {
      if (c.types.includes('locality') || c.types.includes('sublocality_level_1')) {
        region = c.long_name;
        break;
      }
      if (c.types.includes('administrative_area_level_2')) {
        region = c.long_name;
      }
    }
    const result = { lat, lng, region, formatted: data.results[0].formatted_address };
    geocodeCache[address] = result;
    return result;
  }
  throw new Error('住所が見つかりません: ' + address);
}

async function addRide() {
  const date = document.getElementById('ride-date').value;
  const pickupAddr = document.getElementById('pickup-address').value;
  const dropoffAddr = document.getElementById('dropoff-address').value;
  const fare = document.getElementById('ride-fare').value;
  const pax = document.getElementById('ride-pax').value;
  const memo = document.getElementById('ride-memo').value;

  if (!date || !pickupAddr || !dropoffAddr || !fare) {
    return toast('日付・乗車地・降車地・金額は必須です', true);
  }

  try {
    toast('住所を検索中...');
    const [pickup, dropoff] = await Promise.all([
      geocodeAddress(pickupAddr),
      geocodeAddress(dropoffAddr)
    ]);

    await api.post('/api/rides', {
      date, fare: parseInt(fare), passenger_count: parseInt(pax) || 1, memo,
      pickup_address: pickup.formatted,
      pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_region: pickup.region,
      dropoff_address: dropoff.formatted,
      dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_region: dropoff.region
    });

    toast('乗降記録を登録しました ✓');
    document.getElementById('pickup-address').value = '';
    document.getElementById('dropoff-address').value = '';
    document.getElementById('ride-fare').value = '';
    document.getElementById('ride-memo').value = '';
    document.getElementById('ride-pax').value = '1';
    await loadRidesList();
  } catch (e) {
    toast(e.message || '登録に失敗しました', true);
  }
}

async function loadRidesList() {
  try {
    const start = document.getElementById('ride-start').value || monthStart();
    const end = document.getElementById('ride-end').value || today();
    const rows = await api.get('/api/rides', { start, end });

    const tbody = document.getElementById('rides-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">データがありません</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${fmt.date(r.date)}</td>
        <td>
          <div><span class="badge badge-pickup">乗</span> ${r.pickup_region || '不明'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${r.pickup_address}</div>
        </td>
        <td>
          <div><span class="badge badge-dropoff">降</span> ${r.dropoff_region || '不明'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${r.dropoff_address}</div>
        </td>
        <td class="mono">${fmt.yen(r.fare)}</td>
        <td>${r.passenger_count}人</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteRide(${r.id})">削除</button></td>
      </tr>
    `).join('');
  } catch (e) { toast('データ取得に失敗しました', true); }
}

async function deleteRide(id) {
  if (!confirm('削除しますか？')) return;
  try {
    await api.del('/api/rides/' + id);
    toast('削除しました');
    await loadRidesList();
  } catch (e) { toast('削除に失敗しました', true); }
}

// ===== 分析ページ =====
let regionPickupChart = null;
let regionDropoffChart = null;
let regionChartType = 'pie';

async function loadAnalysisPage() {
  await loadRegionStats();
}

async function loadRegionStats() {
  try {
    const start = document.getElementById('analysis-start').value || monthStart();
    const end = document.getElementById('analysis-end').value || today();
    const data = await api.get('/api/rides/region-stats', { start, end });
    renderRegionCharts(data);
    renderRegionBars(data);
  } catch (e) { toast('分析データ取得に失敗しました', true); }
}

const CHART_COLORS = ['#f5c518','#3b82f6','#22c55e','#ef4444','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#fb923c'];

function renderRegionCharts(data) {
  const pickupLabels = data.pickup.map(d => d.region || '不明');
  const pickupValues = data.pickup.map(d => Number(d.pickup_count));
  const dropoffLabels = data.dropoff.map(d => d.region || '不明');
  const dropoffValues = data.dropoff.map(d => Number(d.dropoff_count));

  if (regionPickupChart) regionPickupChart.destroy();
  if (regionDropoffChart) regionDropoffChart.destroy();

  const opts = (labels, values) => ({
    type: regionChartType === 'bar' ? 'bar' : 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: '#1a1d27',
        borderWidth: 2,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: regionChartType === 'pie', labels: { color: '#e8eaf0', font: { size: 11 } } }
      },
      scales: regionChartType === 'pie' ? {} : {
        x: { ticks: { color: '#7b8099' }, grid: { color: '#2e3248' } },
        y: { ticks: { color: '#7b8099' }, grid: { color: '#2e3248' } }
      }
    }
  });

  regionPickupChart = new Chart(document.getElementById('regionPickupChart').getContext('2d'), opts(pickupLabels, pickupValues));
  regionDropoffChart = new Chart(document.getElementById('regionDropoffChart').getContext('2d'), opts(dropoffLabels, dropoffValues));
}

function renderRegionBars(data) {
  const container = document.getElementById('region-ranking');
  const maxPickup = Math.max(...data.pickup.map(d => Number(d.pickup_count)), 1);

  container.innerHTML = '<div style="margin-bottom:8px;font-size:12px;color:var(--muted);font-weight:700">乗車地ランキング</div>' +
    data.pickup.slice(0, 8).map(d => `
      <div class="region-bar-wrap">
        <div class="region-bar-label">
          <span>${d.region || '不明'}</span>
          <span class="mono">${d.pickup_count}回 / ${fmt.yen(d.total_fare)}</span>
        </div>
        <div class="region-bar-bg">
          <div class="region-bar-fill" style="width:${Math.round(Number(d.pickup_count) / maxPickup * 100)}%"></div>
        </div>
      </div>
    `).join('') +
    '<div style="margin:16px 0 8px;font-size:12px;color:var(--muted);font-weight:700">降車地ランキング</div>' +
    data.dropoff.slice(0, 8).map(d => `
      <div class="region-bar-wrap">
        <div class="region-bar-label">
          <span>${d.region || '不明'}</span>
          <span class="mono">${d.dropoff_count}回</span>
        </div>
        <div class="region-bar-bg">
          <div class="region-bar-fill" style="width:${Math.round(Number(d.dropoff_count) / Math.max(...data.dropoff.map(x => Number(x.dropoff_count)), 1) * 100)}%;background:var(--accent2)"></div>
        </div>
      </div>
    `).join('');
}

// ===== ルート最適化ページ =====
let passengerList = [];
let routeMap = null;
let directionsRenderer = null;

function initRoutePage() {
  passengerList = [];
  renderPassengerForms();
  if (!routeMap) {
    routeMap = new google.maps.Map(document.getElementById('route-map'), {
      zoom: 12,
      center: { lat: 35.6762, lng: 139.6503 },
      mapTypeId: 'roadmap',
      styles: darkMapStyle()
    });
    directionsRenderer = new google.maps.DirectionsRenderer({
      polylineOptions: { strokeColor: '#f5c518', strokeWeight: 4 }
    });
    directionsRenderer.setMap(routeMap);
  }
}

function addPassenger() {
  passengerList.push({
    id: Date.now(),
    name: `乗客${passengerList.length + 1}`,
    pickup: { address: '', lat: null, lng: null },
    dropoff: { address: '', lat: null, lng: null },
    fare: ''
  });
  renderPassengerForms();
}

function removePassenger(id) {
  passengerList = passengerList.filter(p => p.id !== id);
  renderPassengerForms();
}

function renderPassengerForms() {
  const container = document.getElementById('passenger-forms');
  container.innerHTML = passengerList.map((p, i) => `
    <div class="passenger-card">
      <div class="card-header">
        <div class="passenger-label">🚖 ${p.name}</div>
        <button class="btn btn-sm btn-danger" onclick="removePassenger(${p.id})">削除</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>名前</label>
          <input type="text" value="${p.name}" oninput="updatePassenger(${p.id}, 'name', this.value)" placeholder="乗客名">
        </div>
        <div class="form-group">
          <label>料金（予定）</label>
          <input type="number" value="${p.fare}" oninput="updatePassenger(${p.id}, 'fare', this.value)" placeholder="例: 1500">
        </div>
        <div class="form-group">
          <label>🟢 乗車地</label>
          <input type="text" value="${p.pickup.address}" oninput="updatePassenger(${p.id}, 'pickup_address', this.value)" placeholder="例: 渋谷駅">
        </div>
        <div class="form-group">
          <label>🔵 降車地</label>
          <input type="text" value="${p.dropoff.address}" oninput="updatePassenger(${p.id}, 'dropoff_address', this.value)" placeholder="例: 新宿駅">
        </div>
      </div>
    </div>
  `).join('') || '<div style="color:var(--muted);text-align:center;padding:20px">乗客を追加してください</div>';
}

function updatePassenger(id, field, value) {
  const p = passengerList.find(p => p.id === id);
  if (!p) return;
  if (field === 'pickup_address') p.pickup.address = value;
  else if (field === 'dropoff_address') p.dropoff.address = value;
  else p[field] = value;
}

async function optimizeRoute() {
  if (passengerList.length === 0) return toast('乗客を追加してください', true);

  try {
    toast('住所を検索中...');
    // ジオコード
    for (const p of passengerList) {
      if (!p.pickup.address || !p.dropoff.address) throw new Error(`${p.name}の住所を入力してください`);
      const [pu, dr] = await Promise.all([
        geocodeAddress(p.pickup.address),
        geocodeAddress(p.dropoff.address)
      ]);
      p.pickup = { ...p.pickup, ...pu };
      p.dropoff = { ...p.dropoff, ...dr };
    }

    const result = await api.post('/api/route/optimize', {
      passengers: passengerList.map(p => ({
        name: p.name,
        pickup: { lat: p.pickup.lat, lng: p.pickup.lng, address: p.pickup.formatted || p.pickup.address },
        dropoff: { lat: p.dropoff.lat, lng: p.dropoff.lng, address: p.dropoff.formatted || p.dropoff.address },
        fare: parseInt(p.fare) || 0
      }))
    });

    renderRouteResult(result);
    drawRouteOnMap(result.stops);
    toast('ルートを最適化しました ✓');
  } catch (e) {
    toast(e.message || '最適化に失敗しました', true);
  }
}

function renderRouteResult(result) {
  const container = document.getElementById('route-result');
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:13px;color:var(--muted)">合計 ${result.stops.length} ストップ</span>
      <span style="font-family:'DM Mono',monospace;font-size:20px;color:var(--accent);font-weight:700">${fmt.yen(result.total_fare)}</span>
    </div>
    ${result.stops.map((s, i) => `
      <div class="route-stop">
        <div class="stop-icon ${s.type}">${s.type === 'pickup' ? '↑' : '↓'}</div>
        <div class="stop-info">
          <div class="stop-name">${i + 1}. ${s.passenger} の${s.type === 'pickup' ? '乗車' : '降車'}</div>
          <div class="stop-address">${s.address}</div>
          ${s.fare ? `<div class="stop-fare">${fmt.yen(s.fare)}</div>` : ''}
        </div>
        <span class="badge ${s.type === 'pickup' ? 'badge-pickup' : 'badge-dropoff'}">${s.type === 'pickup' ? '乗車' : '降車'}</span>
      </div>
    `).join('')}
  `;
  document.getElementById('route-result-card').style.display = 'block';
}

function drawRouteOnMap(stops) {
  if (!routeMap || stops.length < 2) return;
  const svc = new google.maps.DirectionsService();
  const waypoints = stops.slice(1, -1).map(s => ({
    location: new google.maps.LatLng(s.lat, s.lng),
    stopover: true
  }));
  svc.route({
    origin: new google.maps.LatLng(stops[0].lat, stops[0].lng),
    destination: new google.maps.LatLng(stops[stops.length - 1].lat, stops[stops.length - 1].lng),
    waypoints,
    travelMode: google.maps.TravelMode.DRIVING
  }, (result, status) => {
    if (status === 'OK') directionsRenderer.setDirections(result);
    else console.warn('Directions failed:', status);
  });
}

// ===== マップスタイル（ダーク） =====
function darkMapStyle() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#1a1d27' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7b8099' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1117' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e3248' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f1117' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d4466' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#22263a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0d16' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#22263a' }] }
  ];
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  // デフォルト日付設定
  document.getElementById('sale-date').value = today();
  document.getElementById('sales-start').value = monthStart();
  document.getElementById('sales-end').value = today();
  document.getElementById('ride-start').value = monthStart();
  document.getElementById('ride-end').value = today();
  document.getElementById('analysis-start').value = monthStart();
  document.getElementById('analysis-end').value = today();

  // 比較デフォルト（今月 vs 先月）
  const now = new Date();
  const thisStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevStart = `${prevEnd.getFullYear()}-${String(prevEnd.getMonth() + 1).padStart(2, '0')}-01`;
  document.getElementById('p1-start').value = thisStart;
  document.getElementById('p1-end').value = today();
  document.getElementById('p2-start').value = prevStart;
  document.getElementById('p2-end').value = prevEnd.toISOString().slice(0, 10);

  showPage('sales');
});
