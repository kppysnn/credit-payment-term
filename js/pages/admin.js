/* Admin pages: Users, Customers, Policy, Matrix */

/* ── Admin Users ── */
PCT.Pages.AdminUsers = {
  title: 'จัดการผู้ใช้',
  render() {
    const users = PCT.Data.getUsers();
    const rows = users.map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="user-avatar sm">${u.name.charAt(0)}</div>${PCT.Utils.escapeHtml(u.name)}</div></td>
        <td class="td-mono text-secondary text-sm">${PCT.Utils.escapeHtml(u.email)}</td>
        <td>${PCT.Utils.roleBadge(u.role)}</td>
        <td>${PCT.Utils.escapeHtml(u.department||'—')}</td>
        <td><span class="badge ${u.active?'badge-approved':'badge-cancelled'}">${u.active?'ใช้งาน':'ปิดการใช้'}</span></td>
        <td class="td-actions">
          <button class="btn-icon" onclick="PCT.Pages.AdminUsers._edit('${u.id}')" title="แก้ไข">${PCT.Icons.edit}</button>
          ${u.id!=='usr_006'?`<button class="btn-icon danger" onclick="PCT.Pages.AdminUsers._delete('${u.id}')" title="ลบ">${PCT.Icons.trash}</button>`:''}
        </td>
      </tr>`).join('');

    return `
      ${PCT.UI.pageHeader({ title:'จัดการผู้ใช้', breadcrumb:[{label:'Dashboard',route:'dashboard'},{label:'ผู้ใช้',route:'admin-users'}],
        actions:`<button class="btn btn-primary" onclick="PCT.Pages.AdminUsers._add()">${PCT.Icons.plus} เพิ่มผู้ใช้</button>` })}
      <div class="card">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>แผนก</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  },
  init() {},
  _formHtml(u={}) {
    return `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">ชื่อ-นามสกุล <span class="required">*</span></label>
          <input class="form-control" id="u-name" value="${PCT.Utils.escapeHtml(u.name||'')}" placeholder="ชื่อ-นามสกุล"/>
        </div>
        <div class="form-group">
          <label class="form-label">อีเมล <span class="required">*</span></label>
          <input class="form-control" id="u-email" type="email" value="${PCT.Utils.escapeHtml(u.email||'')}" placeholder="email@company.com"/>
        </div>
        <div class="form-group">
          <label class="form-label">รหัสผ่าน ${u.id?'(เว้นว่างถ้าไม่เปลี่ยน)':'<span class="required">*</span>'}</label>
          <input class="form-control" id="u-pass" type="password" placeholder="••••••••"/>
        </div>
        <div class="form-group">
          <label class="form-label">บทบาท <span class="required">*</span></label>
          <select class="form-control" id="u-role">
            ${Object.entries(PCT.ROLE_LABELS).map(([v,l])=>`<option value="${v}" ${u.role===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">แผนก</label>
          <input class="form-control" id="u-dept" value="${PCT.Utils.escapeHtml(u.department||'')}" placeholder="ชื่อแผนก"/>
        </div>
        <div class="form-group">
          <label class="form-label">สถานะ</label>
          <select class="form-control" id="u-active">
            <option value="1" ${u.active!==false?'selected':''}>ใช้งาน</option>
            <option value="0" ${u.active===false?'selected':''}>ปิดการใช้งาน</option>
          </select>
        </div>
      </div>`;
  },
  _add() {
    PCT.UI.showModal({ title:'เพิ่มผู้ใช้ใหม่', body:this._formHtml(), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="u-save-btn">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('u-save-btn').onclick = () => this._save(null);
  },
  _edit(id) {
    const u = PCT.Data.getUserById(id);
    PCT.UI.showModal({ title:'แก้ไขผู้ใช้', body:this._formHtml(u), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="u-save-btn">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('u-save-btn').onclick = () => this._save(id);
  },
  _save(id) {
    const name = document.getElementById('u-name').value.trim();
    const email= document.getElementById('u-email').value.trim();
    const pass = document.getElementById('u-pass').value;
    const role = document.getElementById('u-role').value;
    if (!name||!email) { PCT.UI.toast('กรุณากรอกข้อมูลที่จำเป็น','warning'); return; }
    if (!id && !pass)  { PCT.UI.toast('กรุณาตั้งรหัสผ่าน','warning'); return; }
    const user = id ? { ...PCT.Data.getUserById(id) } : { id:'usr_'+PCT.Utils.uid() };
    user.name=name; user.email=email; user.role=role;
    user.department=document.getElementById('u-dept').value.trim();
    user.active=document.getElementById('u-active').value==='1';
    if (pass) user.password=pass;
    PCT.Data.saveUser(user);
    PCT.UI.hideModal();
    PCT.UI.toast(id?'อัปเดตผู้ใช้แล้ว':'เพิ่มผู้ใช้แล้ว','success');
    PCT.Router.navigate('admin-users');
  },
  _delete(id) {
    PCT.UI.confirm({ title:'ลบผู้ใช้', msg:'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?', confirmLabel:'ลบ', danger:true,
      onConfirm:()=>{ PCT.Data.deleteUser(id); PCT.UI.toast('ลบผู้ใช้แล้ว','success'); PCT.Router.navigate('admin-users'); } });
  }
};

/* ── Admin Customers ── */
PCT.Pages.AdminCustomers = {
  title: 'จัดการลูกค้า',
  render() {
    const custs = PCT.Data.getCustomers();
    const rows = custs.map(c => `
      <tr>
        <td><span class="td-mono">${PCT.Utils.escapeHtml(c.code)}</span></td>
        <td class="td-bold">${PCT.Utils.escapeHtml(c.name)}</td>
        <td class="td-mono text-sm text-secondary">${PCT.Utils.escapeHtml(c.taxId||'—')}</td>
        <td>${PCT.Utils.formatCurrency(c.creditLimit)}</td>
        <td>${c.creditTermDays} วัน</td>
        <td>${PCT.Utils.riskBadge(c.riskLevel)}</td>
        <td><span class="badge ${c.status==='active'?'badge-approved':'badge-cancelled'}">${c.status==='active'?'ใช้งาน':'ปิด'}</span></td>
        <td class="td-actions">
          <button class="btn-icon" onclick="PCT.Pages.AdminCustomers._edit('${c.id}')">${PCT.Icons.edit}</button>
          <button class="btn-icon danger" onclick="PCT.Pages.AdminCustomers._delete('${c.id}')">${PCT.Icons.trash}</button>
        </td>
      </tr>`).join('');

    return `
      ${PCT.UI.pageHeader({ title:'จัดการลูกค้า', breadcrumb:[{label:'Dashboard',route:'dashboard'},{label:'ลูกค้า',route:'admin-customers'}],
        actions:`<button class="btn btn-primary" onclick="PCT.Pages.AdminCustomers._add()">${PCT.Icons.plus} เพิ่มลูกค้า</button>` })}
      <div class="card">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>รหัส</th><th>ชื่อลูกค้า</th><th>เลขภาษี</th><th>วงเงิน</th><th>เทอม</th><th>ความเสี่ยง</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  },
  init() {},
  _formHtml(c={}) {
    return `
      <div class="form-grid">
        <div class="form-group"><label class="form-label">รหัสลูกค้า <span class="required">*</span></label><input class="form-control" id="c-code" value="${PCT.Utils.escapeHtml(c.code||'')}" placeholder="C001"/></div>
        <div class="form-group"><label class="form-label">ชื่อลูกค้า <span class="required">*</span></label><input class="form-control" id="c-name" value="${PCT.Utils.escapeHtml(c.name||'')}" /></div>
        <div class="form-group"><label class="form-label">เลขประจำตัวผู้เสียภาษี</label><input class="form-control" id="c-tax" value="${PCT.Utils.escapeHtml(c.taxId||'')}" /></div>
        <div class="form-group"><label class="form-label">ผู้ติดต่อ</label><input class="form-control" id="c-contact" value="${PCT.Utils.escapeHtml(c.contact||'')}" /></div>
        <div class="form-group"><label class="form-label">โทรศัพท์</label><input class="form-control" id="c-phone" value="${PCT.Utils.escapeHtml(c.phone||'')}" /></div>
        <div class="form-group"><label class="form-label">อีเมล</label><input class="form-control" id="c-email" value="${PCT.Utils.escapeHtml(c.email||'')}" /></div>
        <div class="form-group"><label class="form-label">วงเงินเครดิต (บาท)</label><input class="form-control" id="c-limit" type="number" value="${c.creditLimit||''}" /></div>
        <div class="form-group"><label class="form-label">เทอมเครดิต (วัน)</label><input class="form-control" id="c-term" type="number" value="${c.creditTermDays||30}" /></div>
        <div class="form-group"><label class="form-label">ระดับความเสี่ยง</label>
          <select class="form-control" id="c-risk"><option value="low" ${c.riskLevel==='low'?'selected':''}>ต่ำ</option><option value="medium" ${c.riskLevel==='medium'?'selected':''}>กลาง</option><option value="high" ${c.riskLevel==='high'?'selected':''}>สูง</option></select></div>
        <div class="form-group"><label class="form-label">สถานะ</label>
          <select class="form-control" id="c-status"><option value="active" ${c.status==='active'?'selected':''}>ใช้งาน</option><option value="inactive" ${c.status==='inactive'?'selected':''}>ปิดการใช้งาน</option></select></div>
      </div>`;
  },
  _add() {
    PCT.UI.showModal({ title:'เพิ่มลูกค้าใหม่', size:'modal-lg', body:this._formHtml(), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="c-save-btn">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('c-save-btn').onclick = () => this._save(null);
  },
  _edit(id) {
    const c = PCT.Data.getCustomerById(id);
    PCT.UI.showModal({ title:'แก้ไขลูกค้า', size:'modal-lg', body:this._formHtml(c), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="c-save-btn">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('c-save-btn').onclick = () => this._save(id);
  },
  _save(id) {
    const code = document.getElementById('c-code').value.trim();
    const name = document.getElementById('c-name').value.trim();
    if (!code||!name) { PCT.UI.toast('กรุณากรอกรหัสและชื่อลูกค้า','warning'); return; }
    const cust = id ? { ...PCT.Data.getCustomerById(id) } : { id:'cust_'+PCT.Utils.uid() };
    cust.code=code; cust.name=name;
    cust.taxId=document.getElementById('c-tax').value.trim();
    cust.contact=document.getElementById('c-contact').value.trim();
    cust.phone=document.getElementById('c-phone').value.trim();
    cust.email=document.getElementById('c-email').value.trim();
    cust.creditLimit=parseFloat(document.getElementById('c-limit').value)||0;
    cust.creditTermDays=parseInt(document.getElementById('c-term').value)||30;
    cust.riskLevel=document.getElementById('c-risk').value;
    cust.status=document.getElementById('c-status').value;
    cust.currentCredit=cust.currentCredit||0;
    PCT.Data.saveCustomer(cust);
    PCT.UI.hideModal();
    PCT.UI.toast(id?'อัปเดตลูกค้าแล้ว':'เพิ่มลูกค้าแล้ว','success');
    PCT.Router.navigate('admin-customers');
  },
  _delete(id) {
    PCT.UI.confirm({ title:'ลบลูกค้า', msg:'คุณแน่ใจหรือไม่?', confirmLabel:'ลบ', danger:true,
      onConfirm:()=>{ PCT.Data.deleteCustomer(id); PCT.UI.toast('ลบลูกค้าแล้ว','success'); PCT.Router.navigate('admin-customers'); } });
  }
};

/* ── Admin Policy ── */
PCT.Pages.AdminPolicy = {
  title: 'นโยบายระบบ',
  render() {
    const pols = PCT.Data.getPolicies();
    const rows = pols.map(p => `
      <tr>
        <td class="td-bold">${PCT.Utils.escapeHtml(p.label)}</td>
        <td class="td-mono text-secondary text-sm">${PCT.Utils.escapeHtml(p.key)}</td>
        <td><span style="font-size:1.1rem;font-weight:700;color:var(--navy)">${PCT.Utils.escapeHtml(p.value)}</span> <span class="text-muted text-sm">${PCT.Utils.escapeHtml(p.unit)}</span></td>
        <td class="td-actions">
          <button class="btn-icon" onclick="PCT.Pages.AdminPolicy._edit('${p.id}')">${PCT.Icons.edit}</button>
        </td>
      </tr>`).join('');

    return `
      ${PCT.UI.pageHeader({ title:'นโยบายระบบ', subtitle:'กำหนดพารามิเตอร์สำหรับการควบคุมคำขอ', breadcrumb:[{label:'Dashboard',route:'dashboard'},{label:'นโยบาย',route:'admin-policy'}] })}
      <div class="card">
        <div class="card-header"><div class="card-title">${PCT.Icons.shield} ตั้งค่านโยบาย</div></div>
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>นโยบาย</th><th>Key</th><th>ค่า</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  },
  init() {},
  _edit(id) {
    const p = PCT.Data.getPolicies().find(x=>x.id===id);
    PCT.UI.showModal({ title:'แก้ไขนโยบาย', size:'modal-sm', body:`
      <div class="form-group mb-4">
        <label class="form-label">${PCT.Utils.escapeHtml(p.label)}</label>
        <div class="input-group"><input class="form-control" id="pol-val" type="number" value="${p.value}" /><span class="input-addon">${PCT.Utils.escapeHtml(p.unit)}</span></div>
      </div>`,
      footer:`<button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button><button class="btn btn-primary" id="pol-save">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('pol-save').onclick = () => {
      p.value = document.getElementById('pol-val').value;
      PCT.Data.savePolicy(p);
      PCT.UI.hideModal();
      PCT.UI.toast('อัปเดตนโยบายแล้ว','success');
      PCT.Router.navigate('admin-policy');
    };
  }
};

/* ── Admin Matrix ── */
PCT.Pages.AdminMatrix = {
  title: 'Approval Matrix',
  render() {
    const matrix = PCT.Data.getMatrix();
    const rows = matrix.map(m => `
      <tr>
        <td>${PCT.Utils.formatCurrency(m.amountFrom)} – ${m.amountTo>=99999999?'ไม่จำกัด':PCT.Utils.formatCurrency(m.amountTo)}</td>
        <td><span class="badge badge-role-approver">Level ${m.approverLevel}</span></td>
        <td>${PCT.Utils.escapeHtml(m.description)}</td>
        <td class="td-actions">
          <button class="btn-icon" onclick="PCT.Pages.AdminMatrix._edit('${m.id}')">${PCT.Icons.edit}</button>
          <button class="btn-icon danger" onclick="PCT.Pages.AdminMatrix._delete('${m.id}')">${PCT.Icons.trash}</button>
        </td>
      </tr>`).join('');

    return `
      ${PCT.UI.pageHeader({ title:'Approval Matrix', subtitle:'กำหนดผู้อนุมัติตามวงเงินคำขอ', breadcrumb:[{label:'Dashboard',route:'dashboard'},{label:'Matrix',route:'admin-matrix'}],
        actions:`<button class="btn btn-primary" onclick="PCT.Pages.AdminMatrix._add()">${PCT.Icons.plus} เพิ่มกฎ</button>` })}
      <div class="card">
        <div class="card-header"><div class="card-title">${PCT.Icons.grid} เงื่อนไขการอนุมัติ</div></div>
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>ช่วงวงเงิน</th><th>ระดับผู้อนุมัติ</th><th>คำอธิบาย</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4"><div class="empty-state" style="padding:24px"><p class="empty-desc">ยังไม่มีกฎ</p></div></td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  },
  init() {},
  _formHtml(m={}) {
    return `
      <div class="form-grid">
        <div class="form-group"><label class="form-label">วงเงินขั้นต่ำ (บาท)</label><input class="form-control" id="m-from" type="number" value="${m.amountFrom||0}" /></div>
        <div class="form-group"><label class="form-label">วงเงินสูงสุด (บาท, 0=ไม่จำกัด)</label><input class="form-control" id="m-to" type="number" value="${m.amountTo||0}" /></div>
        <div class="form-group"><label class="form-label">ระดับผู้อนุมัติ</label>
          <select class="form-control" id="m-level"><option value="1" ${m.approverLevel===1?'selected':''}>Level 1</option><option value="2" ${m.approverLevel===2?'selected':''}>Level 2</option></select></div>
        <div class="form-group"><label class="form-label">คำอธิบาย</label><input class="form-control" id="m-desc" value="${PCT.Utils.escapeHtml(m.description||'')}" /></div>
      </div>`;
  },
  _add() {
    PCT.UI.showModal({ title:'เพิ่มกฎ Approval', body:this._formHtml(), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="m-save">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('m-save').onclick = () => this._save(null);
  },
  _edit(id) {
    const m = PCT.Data.getMatrix().find(x=>x.id===id);
    PCT.UI.showModal({ title:'แก้ไขกฎ Approval', body:this._formHtml(m), footer:`
      <button class="btn btn-secondary" onclick="PCT.UI.hideModal()">ยกเลิก</button>
      <button class="btn btn-primary" id="m-save">${PCT.Icons.check} บันทึก</button>` });
    document.getElementById('m-save').onclick = () => this._save(id);
  },
  _save(id) {
    const from = parseFloat(document.getElementById('m-from').value)||0;
    const to   = parseFloat(document.getElementById('m-to').value)||99999999;
    const rec  = id ? { ...PCT.Data.getMatrix().find(x=>x.id===id) } : { id:'mat_'+PCT.Utils.uid() };
    rec.amountFrom=from; rec.amountTo=to;
    rec.approverLevel=parseInt(document.getElementById('m-level').value);
    rec.description=document.getElementById('m-desc').value.trim();
    PCT.Data.saveMatrix(rec);
    PCT.UI.hideModal();
    PCT.UI.toast(id?'อัปเดตกฎแล้ว':'เพิ่มกฎแล้ว','success');
    PCT.Router.navigate('admin-matrix');
  },
  _delete(id) {
    PCT.UI.confirm({ title:'ลบกฎ', msg:'ต้องการลบกฎนี้?', confirmLabel:'ลบ', danger:true,
      onConfirm:()=>{ PCT.Data.deleteMatrix(id); PCT.UI.toast('ลบกฎแล้ว','success'); PCT.Router.navigate('admin-matrix'); } });
  }
};
