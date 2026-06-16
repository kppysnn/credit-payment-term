/* Authentication */
PCT.Auth = {
  login(email, password) {
    const user = PCT.Data.getUserByEmail(email);
    if (!user || user.password !== password || !user.active) return null;
    const session = { ...user };
    delete session.password;
    localStorage.setItem(PCT.STORAGE.CURRENT_USER, JSON.stringify(session));
    return session;
  },

  logout() {
    localStorage.removeItem(PCT.STORAGE.CURRENT_USER);
    window.location.hash = '';
    location.reload();
  },

  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(PCT.STORAGE.CURRENT_USER)); } catch { return null; }
  },

  isLoggedIn() { return !!this.getCurrentUser(); },

  hasRole(...roles) {
    const u = this.getCurrentUser();
    return u && roles.includes(u.role);
  }
};
