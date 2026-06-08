// Central API helper — Optimised (4 requests per student lifecycle)
const api = {

  // ── Request 1: Login + Dashboard Data ────────────────────────────────
  // Replaces: getStudentName + getExams + getMyExams (3 → 1)
  login: ({ rollNumber, email }) =>
    fetch('/api/users/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rollNumber, email }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Login failed');
      return data; // { student, exams: { current, upcoming, past } }
    }),

  // ── Request 2: Register + Exam Details + Questions ───────────────────
  // Replaces: register + getExam + getQuestions (3 → 1)
  register: ({ rollNumber, email, examId }) =>
    fetch('/api/users/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rollNumber, email, examId }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Registration failed');
      return data; // { ...user, examDetails, questions }
    }),

  // ── Request 3: Submit ─────────────────────────────────────────────────
  submitTest: ({ rollNumber, examId, answers }) =>
    fetch('/api/users/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rollNumber, examId, answers }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Submission failed');
      return data;
    }),

  // ── Request 4: Results ────────────────────────────────────────────────
  getResult: (examId, rollNumber) =>
    fetch(`/api/users/result/${examId}/${rollNumber}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to load result analysis');
      return data;
    }),

  // ── Optional: Analysis (user-triggered only) ─────────────────────────
  getAggregatedAnalysis: (rollNumber, collegeId) =>
    fetch(`/api/users/analysis/${rollNumber}?collegeId=${collegeId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to fetch aggregated analysis');
      return data;
    }),

  // ── Optional: Answer Key download (user-triggered only) ──────────────
  getAnswerKey: (examId) =>
    fetch(`/api/questions/answer-key?examId=${examId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Answer key unavailable');
      return data;
    }),
};
