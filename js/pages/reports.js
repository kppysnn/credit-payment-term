/* Reports page with Chart.js */
PCT.Pages.Reports = {
  title: 'รายงาน & Analytics',
  _charts: [],

  render() {
    const reqs = PCT.Data.getRequests();
    const stats = PCT.Data.getStats();
    const totalAmt = reqs.reduce((s,r)=>s+(r.salePrice || r.creditAmount || r.dealValue || 0),0);

    return `
      ${PCT.UI.pageHeader({
        title: 'รายงาน & Analytics',
        subtitle: 'ภาพรวมการขอปรับเงื่อนไขการชำระเงินและวงเงินเครดิต',
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'รายงาน',route:'reports'}]
      })}

      <div class="stat-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-icon blue">${PCT.Icons.file}</div><div class="stat-body"><div class="stat-value">${stats.total}</div><div class="stat-label">คำขอทั้งหมด</div></div></div>
        <div class="stat-card"><div class="stat-icon green">${PCT.Icons.checkCircle}</div><div class="stat-body"><div class="stat-value">${stats.approved+stats.processed}</div><div class="stat-label">อนุมัติ (รวม)</div></div></div>
        <div class="stat-card"><div class="stat-icon red">${PCT.Icons.xCircle}</div><div class="stat-body"><div class="stat-value">${stats.rejected}</div><div class="stat-label">ไม่อนุมัติ</div></div></div>
        <div class="stat-card"><div class="stat-icon gold">${PCT.Icons.dollarSign}</div><div class="stat-body"><div class="stat-value" style="font-size:1.3rem">${PCT.Utils.formatCurrency(totalAmt)}</div><div class="stat-label">มูลค่าวงเงินรวม (อนุมัติ)</div></div></div>
      </div>

      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">${PCT.Icons.chart} สัดส่วนสถานะคำขอ</div>
          <div class="chart-container"><canvas id="chart-status"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">${PCT.Icons.chart} ประเภทคำขอ</div>
          <div class="chart-container"><canvas id="chart-type"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">${PCT.Icons.trendUp} คำขอรายเดือน (6 เดือนล่าสุด)</div>
          <div class="chart-container"><canvas id="chart-monthly"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">${PCT.Icons.building} Top 5 ลูกค้า (จำนวนคำขอ)</div>
          <div class="chart-container"><canvas id="chart-customers"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">${PCT.Icons.file} รายละเอียดคำขอทั้งหมด</div></div>
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>ประเภท</th><th>มูลค่า</th><th>สถานะ</th><th>วันที่</th></tr></thead>
            <tbody>
              ${reqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(r=>`
                <tr>
                  <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
                  <td>${PCT.Utils.escapeHtml(r.customerName)}</td>
                  <td>${PCT.REQUEST_TYPE_LABELS[r.type]||r.type}</td>
                  <td>${r.salePrice?PCT.Utils.formatCurrency(r.salePrice):r.creditAmount?PCT.Utils.formatCurrency(r.creditAmount):r.paymentTermDays?r.paymentTermDays+' วัน':'—'}</td>
                  <td>${PCT.Utils.statusBadge(r.status)}</td>
                  <td class="text-sm text-secondary">${PCT.Utils.formatDate(r.createdAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  init() {
    const reqs = PCT.Data.getRequests();
    this._charts.forEach(c => c.destroy());
    this._charts = [];

    const COLORS = {
      teal:   '#66C5C5', navy: '#004081', green: '#82C566',
      red:    '#F3554F', amber:'#FFCC00', slate: '#586782'
    };
    const TICK_COLOR = '#586782';
    const GRID_COLOR = 'rgba(208,214,223,0.6)';

    /* Status doughnut */
    const stats = PCT.Data.getStats();
    this._charts.push(new Chart(document.getElementById('chart-status'), {
      type: 'doughnut',
      data: {
        labels: ['รอพิจารณา','อนุมัติ','ไม่อนุมัติ','ดำเนินการแล้ว'],
        datasets: [{ data: [stats.pending,stats.approved,stats.rejected,stats.processed],
          backgroundColor:[COLORS.amber,COLORS.green,COLORS.red,COLORS.teal],
          borderColor:'#FFFFFF', borderWidth:3 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{color:TICK_COLOR,padding:12,font:{size:12}} } } }
    }));

    /* Type bar */
    const types = { hardware:0, software_installation:0, credit_term:0, payment_term:0, both:0 };
    reqs.forEach(r => { if (types[r.type]!==undefined) types[r.type]++; });
    this._charts.push(new Chart(document.getElementById('chart-type'), {
      type: 'bar',
      data: {
        labels: ['Hardware','Software & Installation','วงเงินเครดิต','เงื่อนไขชำระ','ทั้งสองรายการ'],
        datasets: [{ label:'จำนวนคำขอ', data:[types.hardware,types.software_installation,types.credit_term,types.payment_term,types.both],
          backgroundColor:[COLORS.teal,COLORS.navy,'rgba(0,64,129,0.45)',COLORS.slate,'rgba(102,197,197,0.45)'], borderRadius:6 }]
      },
      options: this._barOpts()
    }));

    /* Monthly line */
    const months = [];
    const monthData = {};
    for (let i=5;i>=0;i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('th-TH',{month:'short',year:'2-digit'});
      months.push(label); monthData[key] = { m:label, total:0, approved:0 };
    }
    reqs.forEach(r => {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (monthData[key]) { monthData[key].total++; if(r.status==='approved'||r.status==='processed') monthData[key].approved++; }
    });
    const mValues = Object.values(monthData);
    this._charts.push(new Chart(document.getElementById('chart-monthly'), {
      type: 'line',
      data: {
        labels: mValues.map(m=>m.m),
        datasets: [
          { label:'คำขอทั้งหมด', data:mValues.map(m=>m.total),  borderColor:COLORS.navy, backgroundColor:'rgba(0,64,129,0.08)', fill:true, tension:.4 },
          { label:'อนุมัติ',     data:mValues.map(m=>m.approved),borderColor:COLORS.teal, backgroundColor:'rgba(102,197,197,0.10)', fill:true, tension:.4 }
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, scales:{
        x:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR} },
        y:{ grid:{color:GRID_COLOR}, ticks:{color:TICK_COLOR,stepSize:1} }
      }, plugins:{legend:{labels:{color:TICK_COLOR,font:{size:12}}}}}
    }));

    /* Top customers */
    const custMap = {};
    reqs.forEach(r => { custMap[r.customerName] = (custMap[r.customerName]||0)+1; });
    const top5 = Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
    this._charts.push(new Chart(document.getElementById('chart-customers'), {
      type: 'bar',
      data: {
        labels: top5.map(([n])=>n.length>15?n.slice(0,15)+'...':n),
        datasets: [{ label:'จำนวนคำขอ', data:top5.map(([,v])=>v), backgroundColor:COLORS.teal, borderRadius:6 }]
      },
      options: { ...this._barOpts(), indexAxis:'y' }
    }));
  },

  _barOpts() {
    const TICK_COLOR = '#586782';
    const GRID_COLOR = 'rgba(208,214,223,0.6)';
    return { responsive:true, maintainAspectRatio:false,
      scales:{ x:{grid:{color:GRID_COLOR},ticks:{color:TICK_COLOR}}, y:{grid:{color:GRID_COLOR},ticks:{color:TICK_COLOR}} },
      plugins:{ legend:{ labels:{color:TICK_COLOR,font:{size:12}} } } };
  }
};
