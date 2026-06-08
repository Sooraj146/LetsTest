// Central API helper — Hardened Version
const api = {
  // ── Exams ──────────────────────────────────────────────────────────
  getExams: (collegeId) =>
    fetch(`/api/users/exams?collegeId=${collegeId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to fetch assessments');
      return data;
    }),

  getExam: (examId) =>
    fetch(`/api/exams/${examId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to load assessment details');
      return data;
    }),

  // ── Student registration / submission ──────────────────────────────
  register: ({ name, rollNumber, email, examId }) =>
    fetch('/api/users/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, rollNumber, email, examId }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Registration failed');
      return data;
    }),

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

  getResult: (examId, rollNumber) =>
    fetch(`/api/users/result/${examId}/${rollNumber}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to load result analysis');
      return data;
    }),

  getMyExams: ({ rollNumber, email }) =>
    fetch('/api/users/my-exams', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rollNumber, email }),
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to sync your history');
      return data;
    }),

  getStudentName: (rollNumber, domain) =>
    fetch(`/api/users/student/${rollNumber}?domain=${encodeURIComponent(domain)}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Student identity not verified');
      return data;
    }),

  getAggregatedAnalysis: (rollNumber, collegeId) =>
    fetch(`/api/users/analysis/${rollNumber}?collegeId=${collegeId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to fetch aggregated analysis');
      return data;
    }),

  // ── Questions ────────────────────────────────────────────────────────
  getQuestions: (examId) =>
    fetch(`/api/questions?examId=${examId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to sync question modules');
      return data;
    }),

  getAnswerKey: (examId) =>
    fetch(`/api/questions/answer-key?examId=${examId}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Answer key unavailable');
      return data;
    }),
};
