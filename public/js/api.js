// Central API helper — all fetch calls go through here
const api = {
  // ── Exams ──────────────────────────────────────────────────────────
  getExams: () =>
    fetch('/api/exams').then(r => r.json()),

  getExam: (examId) =>
    fetch(`/api/exams/${examId}`).then(r => r.json()),

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
      if (!r.ok) throw new Error(data.message || 'Failed to load result');
      return data;
    }),

  // Returns { [examId]: { isSubmitted, totalScore } } for the student
  getMyExams: ({ rollNumber, email }) =>
    fetch('/api/users/my-exams', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rollNumber, email }),
    }).then(r => r.json()),

  getStudentName: (rollNumber) =>
    fetch(`/api/users/student/${rollNumber}`).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Student not found');
      return data;
    }),

  // ── Questions ──────────────────────────────────────────────────────
  getQuestions: (examId) =>
    fetch(`/api/questions?examId=${examId}`).then(r => r.json()),

  getAnswerKey: (examId) =>
    fetch(`/api/questions/answer-key?examId=${examId}`).then(r => r.json()),

  // ── Settings (legacy shim — now reads from exam) ───────────────────
  getSettings: (examId) =>
    fetch(`/api/exams/${examId}`).then(r => r.json()),
};
