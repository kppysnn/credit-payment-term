/* Shared UI components */
PCT.UI = {

  /* ── Toast ── */
  toast(msg, type = 'info', title = '') {
    const icons = {
      success: PCT.Icons.checkCircle,
      error:   PCT.Icons.xCircle,
      warning: PCT.Icons.alertTriangle,
      info:    PCT.Icons.info
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${msg}</div>
      </div>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  /* ── Modal ── */
  showModal({ title, body, footer, size = '' }) {
    const overlay = document.getElementById('modal-overlay');
    const box     = document.getElementById('modal-box');
    document.getElementById('modal-title').textContent = title || '';
    document.getElementById('modal-body').innerHTML  = body  || '';
    document.getElementById('modal-footer').innerHTML = footer || '';
    box.className = `modal ${size}`;
    overlay.style.display = 'flex';
  },

  hideModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  },

  confirm({ title, msg, confirmLabel = 'ยืนยัน', danger = false, onConfirm }) {
    this.showModal({
      title,
      body: `<p style="color:var(--body-text);font-size:.9rem;line-height:1.75">${msg}</p>`,
      footer: `
        <button class="btn btn-secondary" id="modal-cancel-btn">ยกเลิก</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmLabel}</button>`
    });
    document.getElementById('modal-cancel-btn').onclick = () => this.hideModal();
    document.getElementById('modal-confirm-btn').onclick = () => { this.hideModal(); onConfirm && onConfirm(); };
  },

  /* ── Sidebar ── */
  renderSidebar() {
    const user = PCT.Auth.getCurrentUser();
    if (!user) return;
    const nav = this.getNavItems(user.role);
    document.getElementById('sidebar-nav').innerHTML = nav.map(group => `
      <div class="nav-group">
        ${group.label ? `<div class="nav-group-label">${group.label}</div>` : ''}
        ${group.items.map(item => `
          <div class="nav-item" data-route="${item.route}">
            ${PCT.Icons[item.icon] || ''}
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          </div>`).join('')}
      </div>`).join('');

    document.getElementById('sidebar-footer').innerHTML = `
      <div class="sidebar-user">
        <div class="user-avatar">${user.name.charAt(0)}</div>
        <div class="user-info">
          <div class="user-name">${PCT.Utils.escapeHtml(user.name)}</div>
          <div class="user-role">${PCT.ROLE_LABELS[user.role] || user.role}</div>
        </div>
        <button class="logout-btn" id="logout-btn" title="ออกจากระบบ">${PCT.Icons.logOut}</button>
      </div>`;

    document.getElementById('topbar-user').innerHTML = `
      <div class="user-avatar sm">${user.name.charAt(0)}</div>
      <span style="font-size:.8rem;color:var(--text-secondary)">${PCT.Utils.escapeHtml(user.name)}</span>`;

    document.getElementById('logout-btn').onclick = () => PCT.Auth.logout();

    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', () => PCT.Router.navigate(el.dataset.route));
    });
  },

  getNavItems(role) {
    const stats = PCT.Data.getStats();
    const groups = [];

    if (role === 'sales') {
      groups.push({ label: 'หน้าหลัก', items: [{ route:'dashboard', icon:'home', label:'Dashboard' }] });
      groups.push({ label: 'คำขอของฉัน', items: [
        { route:'requests',       icon:'file',    label:'คำขอทั้งหมด' },
        { route:'request-create', icon:'filePlus',label:'สร้างคำขอใหม่' }
      ]});
    }

    if (role === 'approver') {
      groups.push({ label: 'หน้าหลัก', items: [{ route:'dashboard', icon:'home', label:'Dashboard' }] });
      groups.push({ label: 'การอนุมัติ', items: [
        { route:'approvals',         icon:'check',  label:'รอพิจารณา',    badge: stats.pending || null },
        { route:'approvals-history', icon:'clock',  label:'ประวัติการอนุมัติ' }
      ]});
    }

    if (role === 'accounting') {
      groups.push({ label: 'หน้าหลัก', items: [{ route:'dashboard', icon:'home', label:'Dashboard' }] });
      groups.push({ label: 'บัญชี', items: [
        { route:'accounting',         icon:'calculator', label:'รอดำเนินการ', badge: stats.approved || null },
        { route:'accounting-history', icon:'clock',      label:'ประวัติ' }
      ]});
    }

    if (role === 'admin') {
      groups.push({ label: 'หน้าหลัก', items: [{ route:'dashboard', icon:'home', label:'Dashboard' }] });
      groups.push({ label: 'คำขอ', items: [
        { route:'requests',  icon:'file',  label:'คำขอทั้งหมด' },
        { route:'approvals', icon:'check', label:'การอนุมัติ', badge: stats.pending || null },
        { route:'accounting',icon:'calculator',label:'บัญชี' }
      ]});
      groups.push({ label: 'รายงาน', items: [
        { route:'reports', icon:'chart', label:'รายงาน & Analytics' }
      ]});
      groups.push({ label: 'ตั้งค่าระบบ', items: [
        { route:'admin-users',     icon:'users',    label:'จัดการผู้ใช้' },
        { route:'admin-customers', icon:'building', label:'จัดการลูกค้า' },
        { route:'admin-policy',    icon:'shield',   label:'นโยบาย' },
        { route:'admin-matrix',    icon:'grid',     label:'Approval Matrix' }
      ]});
    }

    return groups;
  },

  updateSidebarActive(route) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  },

  /* ── Page shell helpers ── */
  setPageTitle(title) {
    document.getElementById('topbar-title').textContent = title;
  },

  pageHeader({ title, subtitle, breadcrumb = [], actions = '' }) {
    const bc = breadcrumb.length
      ? `<div class="breadcrumb">${breadcrumb.map((b, i) =>
          i < breadcrumb.length - 1
            ? `<a href="#" onclick="PCT.Router.navigate('${b.route}');return false">${b.label}</a><span class="breadcrumb-sep">/</span>`
            : `<span>${b.label}</span>`).join('')}</div>`
      : '';
    return `
      <div class="page-header">
        <div>
          ${bc}
          <h1 class="page-title">${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>`;
  }
};
