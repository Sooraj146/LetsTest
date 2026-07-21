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

    // Check if answer key is restricted by administrator
    if (data.isAnswerKeyPublished === false) {
      const akBtn = document.getElementById('downloadAnswerKey');
      if (akBtn) {
        akBtn.style.opacity = '0.6';
        akBtn.style.cursor = 'not-allowed';
        akBtn.title = 'Answer key download is restricted by administrator';
        akBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          Key Restricted
        `;
      }
    }

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

  // ── Download Answer Key PDF ────────────────────────────────

  /**
   * Load an image from a URL and return a Base64 JPEG data-URL via canvas.
   * Returns null if loading fails (CORS, network error, etc.)
   */
  function imageToDataUrl(src) {
    if (src && src.startsWith('data:')) {
      return Promise.resolve(src);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth  || img.width  || 1;
          canvas.height = img.naturalHeight || img.height || 1;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (e) {
          resolve(null); // canvas taint / CORS — skip silently
        }
      };
      img.onerror = () => resolve(null);
      // Append cache-buster for same-origin paths to avoid stale cached no-cors responses
      img.src = src.startsWith('http') ? src : `${src}?_cb=${Date.now()}`;
    });
  }

  /**
   * Draw an image into the PDF document at (x, y), scaled to fit within
   * maxW × maxH mm while preserving aspect ratio.
   * Returns the actual height in mm used, or 0 on failure.
   */
  async function addImageToPDF(doc, src, x, y, maxW, maxH) {
    const dataUrl = await imageToDataUrl(src);
    if (!dataUrl) return 0;

    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        const nw = probe.naturalWidth  || 200;
        const nh = probe.naturalHeight || 200;
        let drawW = maxW;
        let drawH = (nh / nw) * drawW;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = (nw / nh) * drawH;
        }
        doc.addImage(dataUrl, 'JPEG', x, y, drawW, drawH);
        resolve(drawH);
      };
      probe.onerror = () => resolve(0);
      probe.src = dataUrl;
    });
  }

  async function downloadAnswerKey() {
    if (data && data.isAnswerKeyPublished === false) {
      LetsTest.toast('Answer key download is restricted by administrator for this exam', 'error');
      return;
    }

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

      // ── Page constants ──────────────────────────────────
      const PAGE_H       = 297;  // A4 height in mm
      const MARGIN       = 14;
      const CONTENT_W    = 182;  // 210 - 2 * MARGIN
      const IMG_MAX_W    = CONTENT_W; // question image: full width
      const IMG_MAX_H    = 65;        // question image: max height
      const OPT_IMG_MAX_W = 55;       // option image: max width
      const OPT_IMG_MAX_H = 38;       // option image: max height

      // ── Header ─────────────────────────────────────────
      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, 210, 42, 'F');
      doc.setFillColor(0, 229, 255);
      doc.rect(0, 40, 210, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL ANSWER KEY', MARGIN, 16);

      const sectionsList = data.sections || [];
      const sectionLabel = sectionsList.length > 0
        ? `SECTIONS: ${sectionsList.join('  ·  ')}`
        : 'SECTIONS: —';
      doc.setFontSize(10);
      doc.setTextColor(0, 229, 255);
      doc.text(sectionLabel, MARGIN, 26);

      let y = 52;

      // Ensure there is at least `needed` mm before the bottom margin; add page if not
      function ensureSpace(needed) {
        if (y + needed > PAGE_H - 10) {
          doc.addPage();
          y = 20;
        }
      }

      // ── Sections & Questions ────────────────────────────
      for (const section of sectionsList) {
        const questionsList = data.questions[section] || [];
        ensureSpace(20);

        // Section heading
        doc.setFontSize(12);
        doc.setTextColor(10, 10, 15);
        doc.setFont('helvetica', 'bold');
        doc.text(`SECTION: ${section.toUpperCase()}`, MARGIN, y + 6);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y + 8, 196, y + 8);
        y += 16;

        for (let i = 0; i < questionsList.length; i++) {
          const q = questionsList[i];
          ensureSpace(14);

          // Question text
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'bold');
          const qLabel = `Q${i + 1}. ${q.questionText || (q.questionImage ? '' : '(No text)')}`;
          const qLines = doc.splitTextToSize(qLabel, CONTENT_W);
          doc.text(qLines, MARGIN, y);
          y += (qLines.length * 5) + 2;

          // Question image (if any)
          if (q.questionImage) {
            ensureSpace(IMG_MAX_H + 6);
            const imgH = await addImageToPDF(doc, q.questionImage, MARGIN, y, IMG_MAX_W, IMG_MAX_H);
            if (imgH > 0) y += imgH + 5;
          }

          y += 1; // gap before options

          // Options
          const opts = q.options || [];
          for (let idx = 0; idx < opts.length; idx++) {
            const opt = opts[idx];
            const isCorrect  = String(idx) === String(q.correctAnswer);
            const optLabel   = String.fromCharCode(65 + idx);
            const rawText    = typeof opt === 'string' ? opt : (opt.text || '');
            const optImgSrc  = (opt && typeof opt === 'object') ? (opt.image || '') : '';

            const optLines = rawText
              ? doc.splitTextToSize(`${optLabel}. ${rawText}`, CONTENT_W - 10)
              : [`${optLabel}.`];
            const textBlockH = (optLines.length * 5) + 4;

            // Pre-load option image to know its drawn height before drawing the highlight box
            let optImgDataUrl = null;
            let optImgDrawH   = 0;
            if (optImgSrc) {
              optImgDataUrl = await imageToDataUrl(optImgSrc);
              if (optImgDataUrl) {
                const tmpImg = await new Promise(r => {
                  const im = new Image();
                  im.onload  = () => r(im);
                  im.onerror = () => r(null);
                  im.src = optImgDataUrl;
                });
                if (tmpImg) {
                  const nw = tmpImg.naturalWidth  || 100;
                  const nh = tmpImg.naturalHeight || 100;
                  let dw = OPT_IMG_MAX_W;
                  let dh = (nh / nw) * dw;
                  if (dh > OPT_IMG_MAX_H) { dh = OPT_IMG_MAX_H; dw = (nw / nh) * dh; }
                  optImgDrawH = dh;
                }
              }
            }

            const boxH = textBlockH + (optImgDataUrl && optImgDrawH > 0 ? optImgDrawH + 4 : 0);
            ensureSpace(boxH + 3);

            // Correct-answer highlight
            if (isCorrect) {
              doc.setFillColor(240, 253, 244);
              doc.rect(18, y, CONTENT_W - 4, boxH, 'F');
              doc.setFillColor(34, 197, 94);
              doc.rect(18, y, 2, boxH, 'F');
              doc.setTextColor(21, 128, 61);
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(71, 85, 105);
              doc.setFont('helvetica', 'normal');
            }

            doc.text(optLines, 24, y + 5);
            let localY = y + textBlockH;

            // Embed option image
            if (optImgDataUrl && optImgDrawH > 0) {
              doc.addImage(optImgDataUrl, 'JPEG', 24, localY, OPT_IMG_MAX_W, optImgDrawH);
            }

            y += boxH + 2;
          }

          y += 7; // gap between questions
        }
      }

      const safeTitle = examTitle.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
      doc.save(`Answer Key - ${safeTitle}.pdf`);
      LetsTest.toast('Answer key downloaded successfully', 'success');

    } catch (err) {
      LetsTest.toast(err.message || 'Answer key download failed', 'error');
      console.error('Answer key PDF error:', err);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  const downloadBtn = document.getElementById('downloadAnswerKey');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadAnswerKey);
  }
})();
