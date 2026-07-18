/* ============================================================
   TEST PAGE LOGIC
   ============================================================ */

(function () {
  const user = JSON.parse(sessionStorage.getItem('user'));
  const examDetails = JSON.parse(sessionStorage.getItem('examDetails'));
  const originalQuestions = JSON.parse(sessionStorage.getItem('examQuestions')) || [];
  
  if (!user || !examDetails || originalQuestions.length === 0) {
    LetsTest.toast('Invalid test session. Redirecting to dashboard.', 'error');
    setTimeout(() => {
      LetsTest.navigate('dashboard.html');
    }, 1500);
    return;
  }

  // ── Persistent Section-wise Question Shuffling & Option Shuffling ──
  let questions = [];
  let questionShuffledData = [];

  const savedShuffled = sessionStorage.getItem('examQuestions_shuffled');
  const savedShuffledData = sessionStorage.getItem('examQuestions_shuffled_options');

  if (savedShuffled && savedShuffledData) {
    questions = JSON.parse(savedShuffled);
    questionShuffledData = JSON.parse(savedShuffledData);
  } else {
    // Group questions by section to keep them clustered
    const sectionGroups = {};
    originalQuestions.forEach(q => {
      const sec = q.section || 'General';
      if (!sectionGroups[sec]) sectionGroups[sec] = [];
      sectionGroups[sec].push(q);
    });

    // Shuffle questions within each section
    const shuffledQuestions = [];
    Object.keys(sectionGroups).forEach(secName => {
      const group = sectionGroups[secName];
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
      shuffledQuestions.push(...group);
    });

    questions = shuffledQuestions;

    // Shuffle options for each question (Fisher-Yates)
    questionShuffledData = questions.map(q => {
      const indices = q.options.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return {
        shuffledIndices: indices, // maps visualIndex -> originalIndex
        shuffledOptions: indices.map(idx => q.options[idx])
      };
    });

    sessionStorage.setItem('examQuestions_shuffled', JSON.stringify(questions));
    sessionStorage.setItem('examQuestions_shuffled_options', JSON.stringify(questionShuffledData));
  }

  const totalQuestions = questions.length;
  let currentIndex = 0;
  let answers = new Array(totalQuestions).fill(null);
  let flags = new Array(totalQuestions).fill(false);
  let visited = new Array(totalQuestions).fill(false);
  visited[0] = true;
  let isSubmitting = false;

  // Restore progress from local storage if available
  const progressKey = `letstest_progress_${user.rollNumber}_${user.examId}`;
  const savedAnswers = LetsTest.storage.get(progressKey);
  if (savedAnswers && savedAnswers.length === totalQuestions) {
    answers = savedAnswers;
  }

  // Timer state
  let totalSeconds = Math.max(0, Math.floor((new Date(examDetails.endTime).getTime() - Date.now()) / 1000));
  let timerInterval = null;

  // Populate Test Info
  const testTitleEl = document.getElementById('testTitle');
  if (testTitleEl) testTitleEl.textContent = examDetails.title || 'Assessment';

  const studentNameEl = document.getElementById('studentName');
  if (studentNameEl && user) studentNameEl.textContent = user.name || 'Student';

  const totalQEl = document.getElementById('totalQ');
  if (totalQEl) totalQEl.textContent = totalQuestions;

  const qTotalTextEl = document.getElementById('qTotalText');
  if (qTotalTextEl) qTotalTextEl.textContent = totalQuestions;

  // ── Build Question Grid (Section-wise) ─────────────────
  function buildQuestionGrid() {
    const grid = document.getElementById('questionGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Group question indices by section
    const sections = {};
    questions.forEach((q, idx) => {
      const sectionName = q.section || 'General';
      if (!sections[sectionName]) sections[sectionName] = [];
      sections[sectionName].push(idx);
    });

    Object.entries(sections).forEach(([sectionName, indices]) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'navigator-section';

      const heading = document.createElement('div');
      heading.className = 'navigator-section-title';
      heading.textContent = sectionName;

      const buttonsGrid = document.createElement('div');
      buttonsGrid.className = 'question-grid-mini';

      indices.forEach(i => {
        const btn = document.createElement('button');
        btn.className = 'q-btn';
        btn.textContent = i + 1;
        btn.dataset.index = i;

        if (i === currentIndex) btn.classList.add('current');
        else if (flags[i]) btn.classList.add('flagged');
        else if (answers[i] !== null) btn.classList.add('answered');
        else if (!visited[i]) btn.classList.add('not-visited');

        btn.addEventListener('click', () => goToQuestion(i));
        buttonsGrid.appendChild(btn);
      });

      sectionDiv.appendChild(heading);
      sectionDiv.appendChild(buttonsGrid);
      grid.appendChild(sectionDiv);
    });
  }

  function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) return;

    const allAttended = answers.every(a => a !== null);

    if (currentIndex === totalQuestions - 1) {
      nextBtn.textContent = 'Finish';
      // Remove all state classes first
      nextBtn.classList.remove('btn-finish-active-green', 'btn-finish-disabled-grey');
      if (allAttended) {
        // All questions answered — enable and show pure green
        nextBtn.disabled = false;
        nextBtn.classList.add('btn-finish-active-green');
      } else {
        // Not all answered — disable and show dull grey
        nextBtn.disabled = true;
        nextBtn.classList.add('btn-finish-disabled-grey');
      }
    } else {
      nextBtn.innerHTML = `Next <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;
      nextBtn.disabled = false;
      // Remove any finish-specific styles when not on last question
      nextBtn.classList.remove('btn-finish-active-green', 'btn-finish-disabled-grey');
    }
  }

  // ── Render Question ────────────────────────────────────
  function renderQuestion() {
    const q = questions[currentIndex];
    const shuffleInfo = questionShuffledData[currentIndex];
    visited[currentIndex] = true;

    // Header
    const qBadgeEl = document.getElementById('qBadge');
    if (qBadgeEl) qBadgeEl.textContent = currentIndex + 1;

    const qNumTextEl = document.getElementById('qNumText');
    if (qNumTextEl) qNumTextEl.textContent = currentIndex + 1;

    const currentQEl = document.getElementById('currentQ');
    if (currentQEl) currentQEl.textContent = currentIndex + 1;

    const qMarksEl = document.getElementById('qMarks');
    if (qMarksEl) qMarksEl.textContent = q.marks || 1;

    // Progress
    const pct = ((currentIndex + 1) / totalQuestions) * 100;
    const progressFillEl = document.getElementById('questionProgressBar');
    if (progressFillEl) progressFillEl.style.width = pct + '%';

    // Question text with slide animation
    const textEl = document.getElementById('questionText');
    if (textEl) {
      textEl.style.opacity = '0';
      textEl.style.transform = 'translateX(20px)';
      setTimeout(() => {
        // Show prefix only when there is text
        const hasText = !!(q.questionText && q.questionText.trim());
        const textHtml = hasText
          ? `<span class="question-prefix">Q${currentIndex + 1}.</span> ${q.questionText}`
          : `<span class="question-prefix" style="opacity:0.4;">Q${currentIndex + 1}.</span>`;
        const imgHtml = q.questionImage
          ? `<div class="question-media-wrapper">
               <img src="${q.questionImage}" class="question-media zoomable" alt="Question image" onclick="openExamLightbox('${q.questionImage}')" title="Click to enlarge" />
             </div>`
          : '';
        textEl.innerHTML = textHtml + imgHtml;
        textEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateX(0)';
      }, 50);
    }

    // Options with staggered animation
    const optionsList = document.getElementById('optionsList');
    const markers = ['A', 'B', 'C', 'D', 'E', 'F'];

    optionsList.innerHTML = '';
    shuffleInfo.shuffledOptions.forEach((opt, idx) => {
      const originalIdx = shuffleInfo.shuffledIndices[idx];
      const item = document.createElement('div');
      item.className = 'option-item';
      item.dataset.option = idx;
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';

      if (answers[currentIndex] === originalIdx) {
        item.classList.add('selected');
      }

      const optText = typeof opt === 'string' ? opt : (opt?.text || '');
      const optImg  = (opt && typeof opt === 'object') ? (opt.image || '') : '';
      const hasText = !!optText.trim();
      const hasImg  = !!optImg;

      // Mark image-only options so CSS can style them differently
      if (!hasText && hasImg) item.classList.add('option-item--img-only');

      const optImgHtml = hasImg
        ? `<img src="${optImg}" class="option-media zoomable" alt="Option ${idx + 1} image" onclick="openExamLightbox('${optImg}')" title="Click to enlarge" />`
        : '';

      item.innerHTML = `
        <div class="option-marker">${markers[idx] || (idx + 1)}</div>
        <div class="option-content">
          ${hasText ? `<div class="option-text">${optText}</div>` : ''}
          ${optImgHtml}
        </div>
      `;

      item.addEventListener('click', () => selectOption(idx, originalIdx));
      optionsList.appendChild(item);

      // Stagger animation
      setTimeout(() => {
        item.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, 100 + idx * 80);
    });

    // Flag button state
    const flagBtn = document.getElementById('flagBtn');
    if (flags[currentIndex]) {
      flagBtn.classList.add('flagged');
      flagBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg> Unflag`;
    } else {
      flagBtn.classList.remove('flagged');
      flagBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg> Flag`;
    }

    // Navigation buttons
    document.getElementById('prevBtn').disabled = currentIndex === 0;
    document.getElementById('prevBtn').style.opacity = currentIndex === 0 ? '0.4' : '1';

    updateNavigationButtons();

    // Update grid
    buildQuestionGrid();
    updateStats();
  }

  // ── Select Option ──────────────────────────────────────
  function selectOption(visualIdx, originalIdx) {
    answers[currentIndex] = originalIdx;
    LetsTest.storage.set(progressKey, answers);

    // Update UI
    document.querySelectorAll('.option-item').forEach((item, i) => {
      if (i === visualIdx) {
        item.classList.add('selected');
        // Pop animation
        item.style.transform = 'scale(1.02)';
        setTimeout(() => item.style.transform = '', 200);
      } else {
        item.classList.remove('selected');
      }
    });

    buildQuestionGrid();
    updateStats();
    updateNavigationButtons();
  }

  // ── Go to Question ─────────────────────────────────────
  function goToQuestion(index) {
    if (index < 0 || index >= totalQuestions) return;
    currentIndex = index;
    renderQuestion();
  }

  // ── Navigation ─────────────────────────────────────────
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentIndex < totalQuestions - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      showSubmitModal();
    }
  });

  document.getElementById('flagBtn').addEventListener('click', () => {
    flags[currentIndex] = !flags[currentIndex];
    const flagBtn = document.getElementById('flagBtn');

    if (flags[currentIndex]) {
      flagBtn.classList.add('flagged');
      flagBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg> Unflag`;
      LetsTest.toast(`Question ${currentIndex + 1} flagged for review`, 'warning', 2000);
    } else {
      flagBtn.classList.remove('flagged');
      flagBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg> Flag`;
      LetsTest.toast(`Flag removed from Question ${currentIndex + 1}`, 'info', 2000);
    }

    buildQuestionGrid();
    updateStats();
    updateNavigationButtons();
  });

  // ── Clear Selection ────────────────────────────────────
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (answers[currentIndex] !== null) {
      answers[currentIndex] = null;
      LetsTest.storage.set(progressKey, answers);
      document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('selected');
      });
      buildQuestionGrid();
      updateStats();
      updateNavigationButtons();
      LetsTest.toast('Selection cleared', 'info', 2000);
    }
  });

  // ── Update Stats ───────────────────────────────────────
  function updateStats() {
    const answered = answers.filter(a => a !== null).length;
    const flagged = flags.filter(f => f).length;
    const notVisited = visited.filter(v => !v).length;

    const answeredCountEl = document.getElementById('answeredCount');
    if (answeredCountEl) answeredCountEl.textContent = answered;

    const unansweredCountEl = document.getElementById('unansweredCount');
    if (unansweredCountEl) unansweredCountEl.textContent = totalQuestions - answered;

    const flaggedCountEl = document.getElementById('flaggedCount');
    if (flaggedCountEl) flaggedCountEl.textContent = flagged;

    const notVisitedCountEl = document.getElementById('notVisitedCount');
    if (notVisitedCountEl) notVisitedCountEl.textContent = notVisited;
  }

  // ── Timer ──────────────────────────────────────────────
  function startTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerBox = document.getElementById('timerBox');

    timerInterval = setInterval(() => {
      totalSeconds--;

      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        autosubmitTest();
        return;
      }

      timerDisplay.textContent = LetsTest.formatTime(totalSeconds);

      // Warning states
      if (totalSeconds <= 300) {
        timerBox.className = 'timer timer--danger';
      } else if (totalSeconds <= 600) {
        timerBox.className = 'timer timer--warning';
      }
    }, 1000);
  }

  // ── Submit Modal ───────────────────────────────────────
  function showSubmitModal() {
    const answered = answers.filter(a => a !== null).length;
    const flagged = flags.filter(f => f).length;

    document.getElementById('modalAnswered').textContent = answered;
    document.getElementById('modalUnanswered').textContent = totalQuestions - answered;
    document.getElementById('modalFlagged').textContent = flagged;

    LetsTest.openModal('submitModal');
  }

  const submitTestBtn = document.getElementById('submitTestBtn');
  if (submitTestBtn) submitTestBtn.addEventListener('click', showSubmitModal);
  
  const finalSubmitBtn = document.getElementById('finalSubmitBtn');
  if (finalSubmitBtn) finalSubmitBtn.addEventListener('click', showSubmitModal);

  document.getElementById('cancelSubmit').addEventListener('click', () => {
    LetsTest.closeModal('submitModal');
  });

  document.getElementById('confirmSubmit').addEventListener('click', () => {
    LetsTest.closeModal('submitModal');
    submitTest();
  });

  // ── Submit Test ────────────────────────────────────────
  async function submitTest() {
    clearInterval(timerInterval);
    isSubmitting = true;

    // Build payload answers mapping database question ID -> option index
    const payloadAnswers = {};
    questions.forEach((q, i) => {
      if (answers[i] !== null) {
        payloadAnswers[q._id] = answers[i];
      }
    });

    // Show submitting overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: var(--bg-primary);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 16px;
      opacity: 0; transition: opacity 0.5s ease;
    `;
    overlay.innerHTML = `
      <div class="spinner" style="width: 48px; height: 48px; border-width: 4px;"></div>
      <p style="font-family: 'Satisfy', cursive; font-size: 2.2rem; color: var(--text-primary);">
        Loading...
      </p>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');

    try {
      await api.submitTest({
        rollNumber: user.rollNumber,
        examId: user.examId,
        answers: payloadAnswers
      });

      // Clear progress
      LetsTest.storage.remove(progressKey);
      sessionStorage.setItem('needsRefresh', 'true');

      LetsTest.toast('Answers submitted successfully!', 'success');

      setTimeout(() => {
        LetsTest.navigate(`result.html?examId=${user.examId}&rollNumber=${user.rollNumber}`);
      }, 1500);

    } catch (err) {
      isSubmitting = false;
      LetsTest.toast(err.message || 'Submission failed. Please try again.', 'error');
      overlay.remove();
      startTimer();
    }
  }

  // ── Autosubmit & Timeout Modal ─────────────────────────
  async function autosubmitTest() {
    clearInterval(timerInterval);
    isSubmitting = true;

    // Build payload answers mapping database question ID -> option index
    const payloadAnswers = {};
    questions.forEach((q, i) => {
      if (answers[i] !== null) {
        payloadAnswers[q._id] = answers[i];
      }
    });

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: var(--bg-primary);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 16px;
      opacity: 0; transition: opacity 0.5s ease;
    `;
    overlay.innerHTML = `
      <div class="spinner" style="width: 48px; height: 48px; border-width: 4px; border-top-color: var(--accent-red);"></div>
      <p style="font-family: 'Satisfy', cursive; font-size: 2.2rem; color: var(--accent-red); text-shadow: 0 0 10px rgba(255,23,68,0.2);">
        Loading...
      </p>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');

    try {
      await api.submitTest({
        rollNumber: user.rollNumber,
        examId: user.examId,
        answers: payloadAnswers
      });

      LetsTest.storage.remove(progressKey);
      sessionStorage.setItem('needsRefresh', 'true');
      overlay.remove();
      showTimeoutModal();

    } catch (err) {
      console.error('Autosubmit failed:', err);
      LetsTest.storage.remove(progressKey);
      sessionStorage.setItem('needsRefresh', 'true');
      overlay.remove();
      showTimeoutModal();
    }
  }

  function showTimeoutModal() {
    const answered = answers.filter(a => a !== null).length;
    const unanswered = totalQuestions - answered;

    document.getElementById('timeoutAnswered').textContent = answered;
    document.getElementById('timeoutUnanswered').textContent = unanswered;

    LetsTest.openModal('timeoutModal');
  }

  document.getElementById('timeoutOkBtn').addEventListener('click', () => {
    LetsTest.closeModal('timeoutModal');
    LetsTest.navigate(`result.html?examId=${user.examId}&rollNumber=${user.rollNumber}`);
  });

  // ── Toggle Side Panel (mobile) ─────────────────────────
  const togglePanelBtn = document.getElementById('togglePanel');
  if (togglePanelBtn) {
    togglePanelBtn.addEventListener('click', () => {
      const panel = document.getElementById('sidePanel');
      if (panel) panel.classList.toggle('open');
    });
  }

  // ── Keyboard navigation ────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) goToQuestion(currentIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < totalQuestions - 1) goToQuestion(currentIndex + 1);
    } else if (e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const visualIdx = parseInt(e.key) - 1;
      const shuffleInfo = questionShuffledData[currentIndex];
      if (visualIdx < shuffleInfo.shuffledOptions.length) {
        selectOption(visualIdx, shuffleInfo.shuffledIndices[visualIdx]);
      }
    } else if (e.key === 'f' || e.key === 'F') {
      document.getElementById('flagBtn').click();
    }
  });

  // ── Prevent accidental navigation ──────────────────────
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting) return;
    if (answers.some(a => a !== null)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ── Init ───────────────────────────────────────────────
  renderQuestion();
  startTimer();

  LetsTest.toast('Good luck! Use arrow keys to navigate, 1-4 to select options.', 'info', 5000);
})();
