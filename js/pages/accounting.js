/* Accounting pages */
PCT.Pages.Accounting = {
  title: 'รอดำเนินการ',

  render() {
    const reqs = PCT.Data.getRequests().filter(r => r.status === 'approved').sort((a,b)=>new Date(a.updatedAt)-new Date(b.updatedAt));
    const rows = reqs.map(r => {
      const approvedAt = (r.approvals||[]).find(a=>a.action==='approve')?.actionAt;
      return `
        <tr>
          <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
          <td class="td-bold">${PCT.Utils.escapeHtml(r.customerName)}</td>
          <td>${PCT.REQUEST_TYPE_LABELS[r.type]||r.type}</td>
          <td>${r.salePrice ? PCT.Utils.formatCurrency(r.salePrice) : r.creditAmount ? PCT.Utils.formatCurrency(r.creditAmount) : r.paymentTermDays ? r.paymentTermDays+' วัน' : '—'}</td>
          <td class="text-secondary text-sm">${approvedAt ? PCT.Utils.formatDate(approvedAt) : '—'}</td>
          <td class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="PCT.Router.navigate('request-detail',{id:'${r.id}'})">${PCT.Icons.eye} ดู</button>
            <button class="btn btn-purple btn-sm" onclick="PCT.Pages.Accounting._process('${r.id}')">${PCT.Icons.checkCircle} ดำเนินการ</button>
          </td>
        </tr>`;
    }).join('');

    return `
      ${PCT.UI.pageHeader({
        title: 'รอดำเนินการ',
        subtitle: `มี ${reqs.length} คำขอที่อนุมัติแล้ว รอบันทึก`,
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'บัญชี',route:'accounting'}]
      })}
      <div class="card">
        ${reqs.length ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>เลขที่คำขอ</th><th>ลูกค้า</th><th>ประเภท</th><th>มูลค่า</th><th>วันอนุมัติ</th><th></th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>` : `
          <div class="empty-state">
            <div class="empty-icon">${PCT.Icons.checkCircle}</div>
            <div class="empty-title">ไม่มีรายการรอดำเนินการ</div>
            <p class="empty-desc">คำขอทั้งหมดได้รับการดำเนินการแล้ว</p>
          </div>`}
      </div>`;
  },

  init() {},

  _process(id) {
    const req = PCT.Data.getRequestById(id);
    if (!req) return;
    PCT.UI.showModal({
      title: 'บันทึกการดำเนินการ',
      body: `
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:16px;font-size:.875rem">
          <div style="font-weight:600;color:var(--ink);margin-bottom:4px">${PCT.Utils.escapeHtml(req.requestNo)}</div>
          <div style="color:var(--text-secondary)">${PCT.Utils.escapeHtml(req.customerName)} · ${PCT.REQUEST_TYPE_LABELS[req.type]}</div>
          ${req.salePrice || req.creditAmount ? `<div style="color:var(--navy);font-weight:600;margin-top:6px">${PCT.Utils.formatCurrency(req.salePrice || req.creditAmount)}</div>` : ''}
        </div>
        <div class="form-group">
          <label class="form-label">หมายเหตุการดำเนินการ</label>
          <textarea class="form-control" id="acc-note" rows="3" placeholder="บันทึกการอัปเดตในระบบบัญชี..."></textarea>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
        <button class="btn btn-purple" id="acc-confirm-btn">${PCT.Icons.check} ยืนยัน</button>`
    });
    document.getElementById('acc-confirm-btn').onclick = () => {
      const user = PCT.Auth.getCurrentUser();
      req.status = 'processed';
      req.accountingStatus = 'processed';
      req.accountingNote = document.getElementById('acc-note').value.trim();
      req.processedBy  = user.id;
      req.processedAt  = new Date().toISOString();
      PCT.Data.saveRequest(req);
      PCT.UI.hideModal();
      PCT.UI.toast('บันทึกการดำเนินการแล้ว', 'success');
      PCT.Router.navigate('accounting');
    };
  }
};

PCT.Pages.AccountingHistory = {
  title: 'ประวัติการดำเนินการ',

  render() {
    const reqs = PCT.Data.getRequests().filter(r => r.status === 'processed').sort((a,b)=>new Date(b.processedAt)-new Date(a.processedAt));
    const rows = reqs.map(r => {
      const processor = r.processedBy ? PCT.Data.getUserById(r.processedBy)?.name || '—' : '—';
      return `
        <tr>
          <td><span class="td-mono">${PCT.Utils.escapeHtml(r.requestNo)}</span></td>
          <td class="td-bold">${PCT.Utils.escapeHtml(r.customerName)}</td>
          <td>${PCT.REQUEST_TYPE_LABELS[r.type]||r.type}</td>
          <td>${r.salePrice ? PCT.Utils.formatCurrency(r.salePrice) : r.creditAmount ? PCT.Utils.formatCurrency(r.creditAmount) : r.paymentTermDays ? r.paymentTermDays+' วัน' : '—'}</td>
          <td class="text-secondary text-sm">${PCT.Utils.escapeHtml(processor)}</td>
          <td class="text-secondary text-sm">${PCT.Utils.formatDate(r.processedAt)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="PCT.Router.navigate('request-detail',{id:'${r.id}'})">${PCT.Icons.eye}</button></td>
        </tr>`;
    }).join('');

    return `
      ${PCT.UI.pageHeader({
        title: 'ประวัติการดำเนินการ',
        breadcrumb: [{label:'Dashboard',route:'dashboard'},{label:'บัญชี',route:'accounting'},{label:'ประวัติ',route:'accounting-history'}]
      })}
      <div class="card">
        ${reqs.length ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>เลขที่คำขอ</th><th>ลูกค้า</th><th>ประเภท</th><th>มูลค่า</th><th>ผู้ดำเนินการ</th><th>วันที่</th><th></th>
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
