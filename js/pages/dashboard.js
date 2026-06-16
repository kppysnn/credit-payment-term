/* Dashboard — role-based */
PCT.Pages.Dashboard = {
  title: 'Dashboard',

  render() {
    const user  = PCT.Auth.getCurrentUser();
    const stats = PCT.Data.getStats();
    const reqs  = PCT.Data.getRequests();
    const role  = user.role;

    const statCards = {
      sales: [
        { label:'คำขอทั้งหมด',   value: reqs.filter(r=>r.requestedBy===user.id).length, icon:'file',      color:'gold' },
        { label:'รอพิจารณา',     value: reqs.filter(r=>r.requestedBy===user.id&&r.status==='pending').length, icon:'clock',     color:'purple' },
        { label:'อนุมัติแล้ว',   value: reqs.filter(r=>r.requestedBy===user.id&&r.status==='approved').length, icon:'checkCircle',color:'green' },
        { label:'ไม่อนุมัติ',    value: reqs.filter(r=>r.requestedBy===user.id&&r.status==='rejected').length, icon:'xCircle',   color:'red' }
      ],
      approver: [
        { label:'รอพิจารณา',     value: stats.pending,   icon:'clock',      color:'gold' },
        { label:'อนุมัติแล้ว',   value: stats.approved,  icon:'checkCircle',color:'green' },
        { label:'ไม่อนุมัติ',    value: stats.rejected,  icon:'xCircle',    color:'red' },
        { label:'คำขอทั้งหมด',   value: stats.total,     icon:'file',       color:'blue' }
      ],
      accounting: [
        { label:'รอดำเนินการ',   value: stats.approved,  icon:'calculator', color:'gold' },
        { label:'ดำเนินการแล้ว', value: stats.processed, icon:'checkCircle',color:'green' },
        { label:'คำขอทั้งหมด',   value: stats.total,     icon:'file',       color:'blue' },
        { label:'ปฏิเสธ',        value: stats.rejected,  icon:'xCircle',    color:'red' }
      ],
      admin: [
        { label:'คำขอทั้งหมด',   value: stats.total,     icon:'file',      color:'blue' },
        { label:'รอพิจารณา',     value: stats.pending,   icon:'clock',     color:'gold' },
        { label:'อนุมัติแล้ว',   value: stats.approved,  icon:'checkCircle',color:'green' },
        { label:'ดำเนินการแล้ว', value: stats.processed, icon:'calculator',color:'purple' }
      ]
    };

    const cards = (statCards[role] || statCards.admin).map(s => `
      <div class="stat-card">
        <div class="stat-icon ${s.color}">${PCT.Icons[s.icon] || ''}</div>
        <div class="stat-body">
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>`).join('');

    /* Recent requests */
    let myReqs = role === 'sales'
      ? reqs.filter(r => r.requestedBy === user.id)
      : role === 'approver'
        ? reqs.filter(r => r.status === 'pending' || r.status === 'approved')
        : role === 'accounting'
          ? reqs.filter(r => r.status === 'approved' || r.status === 'processed')
          : reqs;

    myReqs = myReqs.sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,5);

    const rows = myReqs.map(r => `
      <tr>
        <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
        <td class="td-bold">${PCT.Utils.escapeHtml(r.customerName)}</td>
        <td>${PCT.REQUEST_TYPE_LABELS[r.type] || r.type}</td>
        <td>${PCT.Utils.statusBadge(r.status)}</td>
        <td class="text-secondary text-sm">${PCT.Utils.timeAgo(r.updatedAt)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="PCT.Router.navigate('request-detail',{id:'${r.id}'})">${PCT.Icons.eye} ดู</button></td>
      </tr>`).join('');

    const quickActions = {
      sales: `<button class="btn btn-primary" onclick="PCT.Router.navigate('request-create')">${PCT.Icons.filePlus} สร้างคำขอใหม่</button>
              <button class="btn btn-secondary" onclick="PCT.Router.navigate('requests')">${PCT.Icons.file} คำขอของฉัน</button>`,
      approver: `<button class="btn btn-primary" onclick="PCT.Router.navigate('approvals')">${PCT.Icons.check} พิจารณาคำขอ</button>`,
      accounting:`<button class="btn btn-primary" onclick="PCT.Router.navigate('accounting')">${PCT.Icons.calculator} ดำเนินการชำระ</button>`,
      admin: `<button class="btn btn-primary" onclick="PCT.Router.navigate('requests')">${PCT.Icons.file} คำขอทั้งหมด</button>
              <button class="btn btn-secondary" onclick="PCT.Router.navigate('reports')">${PCT.Icons.chart} รายงาน</button>`
    };

    return `
      ${PCT.UI.pageHeader({ title: `ยินดีต้อนรับ, ${PCT.Utils.escapeHtml(user.name)}`, subtitle: `บทบาท: ${PCT.ROLE_LABELS[role]} · ${PCT.Utils.formatDate(new Date().toISOString())}`, actions: quickActions[role] || '' })}

      <div class="stat-grid">${cards}</div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">${PCT.Icons.clock} คำขอล่าสุด</div>
          <button class="btn btn-ghost btn-sm" onclick="PCT.Router.navigate('requests')">ดูทั้งหมด ${PCT.Icons.chevronRight}</button>
        </div>
        ${myReqs.length ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>เลขที่คำขอ</th><th>ลูกค้า</th><th>ประเภท</th><th>สถานะ</th><th>อัปเดต</th><th></th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>` : `
          <div class="empty-state">
            <div class="empty-icon">${PCT.Icons.file}</div>
            <div class="empty-title">ยังไม่มีคำขอ</div>
            <p class="empty-desc">ยังไม่มีคำขอในระบบ</p>
          </div>`}
      </div>`;
  },

  init() {}
};
