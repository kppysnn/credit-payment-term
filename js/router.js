/* Hash-based router — stores params separately to avoid hashchange double-render */
PCT.Router = {
  routes: {},
  _pending: null,

  register(name, page) {
    this.routes[name] = page;
  },

  navigate(route, params) {
    this._pending = params || null;
    if (window.location.hash === '#' + route) {
      this._render(route, params);
      this._pending = null;
    } else {
      window.location.hash = route;
    }
  },

  _render(route, params) {
    const page = this.routes[route];
    const el   = document.getElementById('main-content');
    if (!page) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">${PCT.Icons.alertTriangle}</div><div class="empty-title">ไม่พบหน้านี้</div><p class="empty-desc">Route: ${PCT.Utils.escapeHtml(route)}</p></div>`;
      return;
    }
    el.innerHTML = page.render(params);
    PCT.UI.updateSidebarActive(route);
    PCT.UI.setPageTitle(page.title || '');
    page.init && page.init(params);
    window.scrollTo(0, 0);
  },

  start() {
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '') || 'dashboard';
      const params = this._pending;
      this._pending = null;
      this._render(h, params);
      /* Close mobile sidebar on navigation */
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('open');
    });
    const h = window.location.hash.replace('#', '') || 'dashboard';
    this._render(h);
  }
};
