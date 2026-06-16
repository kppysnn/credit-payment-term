/* Utility helpers */
PCT.Utils = {
  formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount);
  },

  formatNumber(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('th-TH').format(n);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
           ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  },

  timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'เมื่อกี้';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hrs / 24);
    return `${days} วันที่แล้ว`;
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  genReqNo() {
    const reqs = PCT.Data.getRequests();
    const year = new Date().getFullYear() + 543;
    const n = (reqs.length + 1).toString().padStart(4, '0');
    return `PCT-${year}-${n}`;
  },

  statusBadge(status) {
    const label = PCT.STATUS_LABELS[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
  },

  roleBadge(role) {
    const label = PCT.ROLE_LABELS[role] || role;
    return `<span class="badge badge-role-${role}">${label}</span>`;
  },

  riskBadge(risk) {
    const labels = { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' };
    return `<span class="badge badge-${risk}">${labels[risk] || risk}</span>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }
};
