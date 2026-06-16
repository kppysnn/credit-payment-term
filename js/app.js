/* Entry point — initializes data, wires up all routes, starts the app */
(function () {
  PCT.Data.init();

  /* Modal close on overlay click / Escape key */
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) PCT.UI.hideModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') PCT.UI.hideModal();
  });
  document.getElementById('modal-close').addEventListener('click', () => PCT.UI.hideModal());

  /* Mobile sidebar toggle */
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  });
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }

  /* Register all routes */
  PCT.Router.register('dashboard',          PCT.Pages.Dashboard);
  PCT.Router.register('requests',           PCT.Pages.Requests);
  PCT.Router.register('request-create',     PCT.Pages.RequestCreate);
  PCT.Router.register('request-detail',     PCT.Pages.RequestDetail);
  PCT.Router.register('approvals',          PCT.Pages.Approvals);
  PCT.Router.register('approvals-history',  PCT.Pages.ApprovalsHistory);
  PCT.Router.register('accounting',         PCT.Pages.Accounting);
  PCT.Router.register('accounting-history', PCT.Pages.AccountingHistory);
  PCT.Router.register('reports',            PCT.Pages.Reports);
  PCT.Router.register('admin-users',        PCT.Pages.AdminUsers);
  PCT.Router.register('admin-customers',    PCT.Pages.AdminCustomers);
  PCT.Router.register('admin-policy',       PCT.Pages.AdminPolicy);
  PCT.Router.register('admin-matrix',       PCT.Pages.AdminMatrix);

  /* Start */
  if (PCT.Auth.isLoggedIn()) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    PCT.UI.renderSidebar();
    PCT.Router.start();
  } else {
    PCT.Pages.Login.init();
  }
})();
