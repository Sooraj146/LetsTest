/* ============================================================
   LOGIN PAGE LOGIC
   ============================================================ */

(function () {
  const form = document.getElementById('loginForm');
  const rollInput = document.getElementById('rollNumber');
  const emailInput = document.getElementById('emailAddress');
  const loginBtn = document.getElementById('loginBtn');
  const rollWrapper = document.getElementById('rollWrapper');
  const emailWrapper = document.getElementById('emailWrapper');

  // ── Validation ─────────────────────────────────────────
  function validateRoll(value) {
    const val = parseInt(value.trim(), 10);
    return !isNaN(val) && val >= 1 && val <= 60;
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function clearErrors() {
    rollWrapper.classList.remove('input-error');
    emailWrapper.classList.remove('input-error');
  }

  // ── Input focus effects ────────────────────────────────
  [rollInput, emailInput].forEach(input => {
    input.addEventListener('focus', () => {
      input.closest('.login-input-wrapper').classList.remove('input-error');
    });

    // Ripple glow on focus
    input.addEventListener('focus', () => {
      const wrapper = input.closest('.login-input-wrapper');
      wrapper.style.transition = 'transform 0.2s ease';
      wrapper.style.transform = 'scale(1.01)';
    });

    input.addEventListener('blur', () => {
      const wrapper = input.closest('.login-input-wrapper');
      wrapper.style.transform = 'scale(1)';
    });
  });

  // ── Form submit ────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const roll = rollInput.value.trim();
    const email = emailInput.value.trim();
    let valid = true;

    if (!validateRoll(roll)) {
      rollWrapper.classList.remove('input-error');
      void rollWrapper.offsetWidth; // trigger reflow
      rollWrapper.classList.add('input-error');
      LetsTest.toast('Roll number must be a number between 1 and 60', 'error');
      valid = false;
    }

    if (!validateEmail(email)) {
      emailWrapper.classList.remove('input-error');
      void emailWrapper.offsetWidth; // trigger reflow
      emailWrapper.classList.add('input-error');
      LetsTest.toast('Please enter a valid email address', 'error');
      valid = false;
    }

    if (!valid) {
      // Shake animation
      form.style.animation = 'shake 0.4s ease';
      setTimeout(() => form.style.animation = '', 400);
      return;
    }

    // Start loading
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    try {
      // API call to login
      const loginData = await api.login({ rollNumber: roll, email: email });

      const studentInfo = {
        name: loginData.student.name,
        rollNumber: loginData.student.rollNumber,
        email: email.toLowerCase(),
        collegeId: loginData.student.collegeId,
        collegeName: loginData.student.collegeName
      };

      // Save student data and login status in sessionStorage and local storage
      sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));
      sessionStorage.setItem('preloadedExams', JSON.stringify(loginData.exams));
      LetsTest.storage.set('isLoggedIn', true);

      LetsTest.toast('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        LetsTest.navigate('dashboard.html');
      }, 800);

    } catch (err) {
      const errMsg = err.message || 'Login failed';
      LetsTest.toast(errMsg, 'error');
      
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;

      const isRollError = errMsg.toLowerCase().includes('roll') || errMsg.toLowerCase().includes('student');
      const isEmailError = errMsg.toLowerCase().includes('email') || errMsg.toLowerCase().includes('college') || errMsg.toLowerCase().includes('domain');

      rollWrapper.classList.remove('input-error');
      emailWrapper.classList.remove('input-error');
      void rollWrapper.offsetWidth;
      void emailWrapper.offsetWidth;

      if (isRollError || (!isRollError && !isEmailError)) {
        rollWrapper.classList.add('input-error');
      }
      if (isEmailError || (!isRollError && !isEmailError)) {
        emailWrapper.classList.add('input-error');
      }

      // Form shake animation
      form.style.animation = 'shake 0.4s ease';
      setTimeout(() => form.style.animation = '', 400);
    }
  });

  // ── Keyboard shortcut ──────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement !== loginBtn) {
      if (rollInput.value && emailInput.value) {
        loginBtn.click();
      }
    }
  });

  // ── Add shake keyframes ────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
})();
