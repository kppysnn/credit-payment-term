/* Approvals pages (list + history) */
PCT.Pages.Approvals = {
  title: 'รอพิจารณา',

  render() {
    const reqs = PCT.Data.getRequests().filter(r => r.status === 'pending').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const rows = reqs.map(r => `
      <tr>
        <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
        <td class="td-bold">${PCT.Utils.escapeHtml(r.customerName)}</td>
        <td>${PCT.REQUEST_TYPE_LABELS[r.type]||r.type}</td>
        <td>${r.salePrice ? PCT.Utils.formatCurrency(r.salePrice) : r.creditAmount ? PCT.Utils.formatCurrency(r.creditAmount) : r.paymentTermDays ? r.paymentTermDays+' วัน' : '—'}</td>
        <td class="text-secondary text-sm">${PCT.Utils.escapeHtml(r.requestedByName)}</td>
        <td class="text-secondary text-sm">${PCT.Utils.formatDate(r.createdAt)}</td>
        <td class="td-actions">
          <button class="btn btn-primary btn-sm" onclick="PCT.Router.navigate('request-detail',{id:'${r.id}'})">${PCT.Icons.eye} พิจารณา</button>
        </td>
      </tr>`).join('');

    return `
      ${PCT.UI.pageHeader({
        title: 'รายการรอพิจารณา',
        subtitle: `มี ${reqs.length} คำขอรอการพิจารณา`,
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'รอพิจารณา',route:'approvals'}]
      })}
      <div class="card">
        ${reqs.length ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>เลขที่คำขอ</th><th>ลูกค้า</th><th>ประเภท</th><th>วงเงิน/เทอม</th><th>ผู้ขอ</th><th>วันที่สร้าง</th><th></th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>` : `
          <div class="empty-state">
            <div class="empty-icon">${PCT.Icons.checkCircle}</div>
            <div class="empty-title">ไม่มีคำขอรอพิจารณา</div>
            <p class="empty-desc">ขณะนี้ไม่มีคำขอที่ต้องพิจารณา</p>
          </div>`}
      </div>`;
  },

  init() {}
};

PCT.Pages.ApprovalsHistory = {
  title: 'ประวัติการอนุมัติ',

  render() {
    const user = PCT.Auth.getCurrentUser();
    const reqs = PCT.Data.getRequests()
      .filter(r => r.status === 'approved' || r.status === 'rejected' || r.status === 'processed')
      .sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt));

    const rows = reqs.map(r => {
      const approval = (r.approvals||[]).find(a=>a.action);
      return `
        <tr>
          <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
          <td class="td-bold">${PCT.Utils.escapeHtml(r.customerName)}</td>
          <td>${PCT.REQUEST_TYPE_LABELS[r.type]||r.type}</td>
          <td>${PCT.Utils.statusBadge(r.status)}</td>
          <td class="text-secondary text-sm">${approval ? PCT.Utils.escapeHtml(approval.approverName) : '—'}</td>
          <td class="text-secondary text-sm">${approval ? PCT.Utils.formatDate(approval.actionAt) : '—'}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="PCT.Router.navigate('request-detail',{id:'${r.id}'})">${PCT.Icons.eye}</button></td>
        </tr>`;
    }).join('');

    return `
      ${PCT.UI.pageHeader({
        title: 'ประวัติการอนุมัติ',
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'ประวัติการอนุมัติ',route:'approvals-history'}]
      })}
      <div class="card">
        ${reqs.length ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>เลขที่คำขอ</th><th>ลูกค้า</th><th>ประเภท</th><th>สถานะ</th><th>ผู้พิจารณา</th><th>วันที่</th><th></th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>` : `
          <div class="empty-state">
            <div class="empty-icon">${PCT.Icons.clock}</div>
            <div class="empty-title">ยังไม่มีประวัติ</div>
          </div>`}
      </div>`;
  },

  init() {}
};
