/* Login page */
PCT.Pages.Login = {
  init() {
    const form = document.getElementById('login-form');
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const errEl   = document.getElementById('login-error');
    const btnEl   = document.getElementById('login-btn');
    const toggleEl= document.getElementById('toggle-password');

    toggleEl.addEventListener('click', () => {
      const isPass = passEl.type === 'password';
      passEl.type = isPass ? 'text' : 'password';
      toggleEl.innerHTML = isPass ? PCT.Icons.eyeOff : PCT.Icons.eye;
    });

    document.querySelectorAll('.demo-badge').forEach(btn => {
      btn.addEventListener('click', () => {
        emailEl.value = btn.dataset.email;
        passEl.value  = btn.dataset.pass;
        errEl.style.display = 'none';
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const email = emailEl.value.trim();
      const pass  = passEl.value;
      if (!email || !pass) {
        errEl.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
        errEl.style.display = 'block';
        return;
      }
      btnEl.disabled = true;
      btnEl.innerHTML = '<div class="spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff;width:16px;height:16px"></div>';
      setTimeout(() => {
        const user = PCT.Auth.login(email, pass);
        if (!user) {
          errEl.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
          errEl.style.display = 'block';
          btnEl.disabled = false;
          btnEl.innerHTML = 'เข้าสู่ระบบ';
          return;
        }
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        PCT.UI.renderSidebar();
        PCT.Router.start();
      }, 400);
    });
  }
};
