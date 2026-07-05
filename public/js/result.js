/* ============================================================
   RESULT PAGE LOGIC – CLEAN, MODERN, PROFESSIONAL UI
   ============================================================ */

(async function () {
  const params = new URLSearchParams(window.location.search);
  const examId = params.get('examId');
  const rollNumber = params.get('rollNumber');

  if (!examId || !rollNumber) {
    LetsTest.toast('Missing exam ID or roll number. Redirecting to dashboard.', 'error');
    setTimeout(() => LetsTest.navigate('dashboard.html'), 2000);
    return;
  }

  let examTitle = 'Assessment';

  // Find exam title from preloaded exams
  const preloadedRaw = sessionStorage.getItem('preloadedExams');
  if (preloadedRaw) {
    try {
      const preloaded = JSON.parse(preloadedRaw);
      const allExams = [
        ...(preloaded.current || []),
        ...(preloaded.upcoming || []),
        ...(preloaded.past || [])
      ];
      const match = allExams.find(e => e._id === examId);
      if (match) examTitle = match.title;
    } catch (e) {
      console.warn('Failed to parse preloaded exams', e);
    }
  }

  try {
    const data = await api.getResult(examId, rollNumber);
    const totalQ = data.totalQuestions || 0;
    const scorePct = totalQ ? Math.round((data.totalScore / totalQ) * 100) : 0;
    const isPassed = scorePct > 0;

    // ── Header updates ───────────────────────────────────
    function populateHeader() {
      const container = document.querySelector('.result-container');
      const heading = document.getElementById('resultHeading');
      const sub = document.getElementById('resultSub');

      if (scorePct === 0) {
        if (container) container.classList.add('result-container--zero');
        heading.textContent = 'Better Try Next Time!';
        if (sub) sub.textContent = `Don't give up! Review "${examTitle}" and come back stronger.`;
      } else {
        heading.textContent = 'Congratulations!';
        if (sub) sub.textContent = `You scored ${scorePct}% on "${examTitle}".`;
      }
    }

    // ── Score ring animation ──────────────────────────────
    function animateRing() {
      const fill = document.getElementById('scoreCircleFill');
      const scoreEl = document.getElementById('totalMarks');

      if (!fill || !scoreEl) return;

      fill.classList.remove('rp-ring-fill--pass', 'rp-ring-fill--fail');
      fill.classList.add(isPassed ? 'rp-ring-fill--pass' : 'rp-ring-fill--fail');

      const circumference = 553;
      const offset = circumference - (circumference * scorePct / 100);

      // Animate total marks counting up inside the circle
      let curScore = 0;
      const targetScore = data.totalScore || 0;

      if (targetScore === 0) {
        scoreEl.textContent = `0 / ${totalQ}`;
      } else {
        const duration = 1200; // total duration in ms
        const steps = targetScore;
        const stepTime = Math.max(20, Math.floor(duration / steps));

        const interval = setInterval(() => {
          curScore++;
          scoreEl.textContent = `${curScore} / ${totalQ}`;
          if (curScore >= targetScore) {
            clearInterval(interval);
          }
        }, stepTime);
      }

      // Animate circle ring offset
      setTimeout(() => {
        fill.style.strokeDashoffset = offset;
      }, 300);
    }

    // ── Stat cards counters ──────────────────────────────
    function populateStats() {
      animateCount('correctCount', data.correctCount);
      animateCount('wrongCount', data.wrongCount);
      animateCount('skippedCount', data.unattemptedCount);
      animateCount('scorePercentage', scorePct, true);
    }

    function animateCount(id, target, isPercentage = false) {
      const el = document.getElementById(id);
      if (!el) return;
      if (target === 0) {
        el.textContent = isPercentage ? '0%' : '0';
        return;
      }
      let cur = 0;
      const inc = Math.max(1, Math.ceil(target / 30));
      const interval = setInterval(() => {
        cur = Math.min(cur + inc, target);
        el.textContent = cur + (isPercentage ? '%' : '');
        if (cur >= target) clearInterval(interval);
      }, 40);
    }

    // ── Section cards list ──────────────────────────────
    function populateSections() {
      const container = document.getElementById('sectionsContainer');
      if (!container) return;
      container.innerHTML = '';

      const details = data.sectionDetails || {};
      const sections = Object.keys(details);

      if (sections.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No section details available.</div>';
        return;
      }

      sections.forEach((name, idx) => {
        const sec = details[name];
        const pct = sec.total ? Math.round((sec.correct / sec.total) * 100) : 0;
        const cPct = sec.total ? Math.round((sec.correct / sec.total) * 100) : 0;
        const wPct = sec.total ? Math.round((sec.wrong / sec.total) * 100) : 0;
        const sPct = Math.max(0, 100 - cPct - wPct);

        let pillClass = 'rp-sec-card__pct--low';
        if (pct >= 70) pillClass = 'rp-sec-card__pct--high';
        else if (pct >= 40) pillClass = 'rp-sec-card__pct--mid';

        const card = document.createElement('div');
        card.className = 'rp-sec-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        card.style.transition = `all 0.4s ${idx * 0.08}s ease-out`;

        card.innerHTML = `
          <div class="rp-sec-card__head">
            <span class="rp-sec-card__name">${name}</span>
            <span class="rp-sec-card__pct ${pillClass}">${pct}%</span>
          </div>
          <div class="rp-sec-card__bar">
            <div class="rp-sec-card__seg rp-sec-card__seg--c"></div>
            <div class="rp-sec-card__seg rp-sec-card__seg--w"></div>
            <div class="rp-sec-card__seg rp-sec-card__seg--s"></div>
          </div>
          <div class="rp-sec-card__stats">
            <span><i class="rp-dot rp-dot--g"></i> <strong>${sec.correct}</strong> Correct</span>
            <span><i class="rp-dot rp-dot--r"></i> <strong>${sec.wrong}</strong> Wrong</span>
            <span><i class="rp-dot rp-dot--o"></i> <strong>${sec.skipped}</strong> Skipped</span>
          </div>
        `;
        container.appendChild(card);

        // Stagger entrance animations
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);

        // Animate segment bar widths
        setTimeout(() => {
          const segs = card.querySelectorAll('.rp-sec-card__seg');
          if (segs.length >= 3) {
            segs[0].style.width = cPct + '%';
            segs[1].style.width = wPct + '%';
            segs[2].style.width = sPct + '%';
          }
        }, 200);
      });
    }

    // ── Confetti effect ──────────────────────────────────
    function launchConfetti() {
      if (!isPassed) return;
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = ['#00e5ff', '#7c4dff', '#ff4081', '#00e676', '#ffd600', '#ff9100'];
      const particles = [];

      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10 - Math.random() * 200,
          w: Math.random() * 10 + 4,
          h: Math.random() * 6 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1
        });
      }

      let frame = 0;
      const maxFrames = 280;

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rotation += p.rotationSpeed;
          if (frame > maxFrames - 60) p.opacity -= 0.016;
          if (p.opacity <= 0) return;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        });
        if (frame < maxFrames) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      animate();
    }

    // ── Init calls ───────────────────────────────────────
    populateHeader();
    populateStats();
    populateSections();
    setTimeout(animateRing, 400);
    setTimeout(launchConfetti, 1000);

    if (isPassed) {
      setTimeout(() => {
        LetsTest.toast(`You scored ${scorePct}% — great effort!`, 'success', 5000);
      }, 1600);
    }

  } catch (err) {
    LetsTest.toast(err.message || 'Failed to load results', 'error');
    console.error(err);
  }

  // ── Download Answer Key PDF ────────────────────────────
  async function downloadAnswerKey() {
    const btn = document.getElementById('downloadAnswerKey');
    const orig = btn ? btn.innerHTML : '';
    const loadingHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin-animation" style="margin-right:6px;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Generating...`;

    if (!document.getElementById('spinStyle')) {
      const style = document.createElement('style');
      style.id = 'spinStyle';
      style.textContent = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    if (btn) { btn.disabled = true; btn.innerHTML = loadingHtml; }

    try {
      const data = await api.getAnswerKey(examId);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');

      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, 210, 42, 'F');
      doc.setFillColor(0, 229, 255);
      doc.rect(0, 40, 210, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL ANSWER KEY', 14, 16);

      const sectionsList = data.sections || [];
      const sectionLabel = sectionsList.length > 0
        ? `SECTIONS: ${sectionsList.join('  ·  ')}`
        : 'SECTIONS: —';
      doc.setFontSize(10);
      doc.setTextColor(0, 229, 255);
      doc.text(sectionLabel, 14, 26);

      let y = 52;

      sectionsList.forEach(section => {
        const questionsList = data.questions[section] || [];
        if (y > 255) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setTextColor(10, 10, 15);
        doc.setFont('helvetica', 'bold');
        doc.text(`SECTION: ${section.toUpperCase()}`, 14, y + 6);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, y + 8, 196, y + 8);
        y += 16;

        questionsList.forEach((q, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'bold');
          const qText = doc.splitTextToSize(`Q${i + 1}. ${q.questionText}`, 174);
          doc.text(qText, 14, y);
          y += (qText.length * 5) + 3;

          const opts = q.options || [];
          opts.forEach((opt, idx) => {
            const isCorrect = String(idx) === String(q.correctAnswer);
            const optLabel = String.fromCharCode(65 + idx);
            const optText = doc.splitTextToSize(`${optLabel}. ${opt}`, 166);
            const boxHeight = (optText.length * 5) + 4;
            if (y + boxHeight > 282) { doc.addPage(); y = 20; }

            if (isCorrect) {
              doc.setFillColor(240, 253, 244);
              doc.rect(18, y, 174, boxHeight, 'F');
              doc.setFillColor(34, 197, 94);
              doc.rect(18, y, 2, boxHeight, 'F');
              doc.setTextColor(21, 128, 61);
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(71, 85, 105);
              doc.setFont('helvetica', 'normal');
            }

            doc.text(optText, 24, y + 5);
            y += boxHeight + 1.5;
          });
          y += 5;
        });
      });

      const safeTitle = examTitle.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
      doc.save(`Answer Key - ${safeTitle}.pdf`);
      LetsTest.toast('Answer key downloaded successfully', 'success');
    } catch (err) {
      LetsTest.toast(err.message || 'Answer key download failed', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  const downloadBtn = document.getElementById('downloadAnswerKey');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadAnswerKey);
  }
})();
