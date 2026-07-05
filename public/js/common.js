/* ============================================================
   COMMON UTILITIES
   Shared across all pages
   ============================================================ */

const LetsTest = {
  // ── Storage helpers ──────────────────────────────────────
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(`letstest_${key}`, JSON.stringify(value));
      } catch (e) { console.warn('Storage unavailable'); }
    },
    get(key) {
      try {
        const val = localStorage.getItem(`letstest_${key}`);
        return val ? JSON.parse(val) : null;
      } catch (e) { return null; }
    },
    remove(key) {
      localStorage.removeItem(`letstest_${key}`);
    },
    clear() {
      Object.keys(localStorage)
        .filter(k => k.startsWith('letstest_'))
        .forEach(k => localStorage.removeItem(k));
    }
  },

  // ── Toast notifications ──────────────────────────────────
  toast(message, type = 'info', duration = 4000) {
    return;
  },

  // ── Modal helpers ────────────────────────────────────────
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // ── Format helpers ───────────────────────────────────────
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  formatDate(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const d = new Date(date);
    return {
      day: d.getDate(),
      month: `${months[d.getMonth()]} ${d.getFullYear()}`,
      full: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
    };
  },

  // ── Navigation ───────────────────────────────────────────
  navigate(page) {
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(10px)';
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      window.location.href = page;
    }, 300);
  }
};
