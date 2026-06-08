# Let's Test - Online Assessment & Examination Platform

An optimized, high-performance, and feature-rich full-stack web application designed for conducting online exams, student aptitude tests, and academic assessments. 

---

## Abstract

**Let's Test** is an online examination and assessment management system engineered to streamline testing for educational institutions and organizations. The project addresses the challenges of platform reliability and network constraints by utilizing an optimized, lightweight architecture. 

A key highlight of the system is the **4-Request Student Lifecycle**, which minimizes server load and API roundtrips during an active exam. Once a student starts an exam, the questions, section-wise layouts, and active status are loaded in a single consolidated API call. The state of the exam is managed and cached in the client's `sessionStorage`, allowing the student to refresh the page or recover from accidental browser crashes without losing progress and without hitting the backend repeatedly. 

The application offers two distinct interfaces:
1. **Student Panel**: Facilitates registration, secure domain validation, smooth section-wise exam navigation, real-time progress tracking, visual performance feedback via interactive charts, and client-side PDF generation of answer keys.
2. **Admin Dashboard**: Enables complete management of exam schedules, questions (including bulk CSV imports), user records, and deep analytics (per-question accuracy rates and score leaderboards).

---

## Key Features

### 🎓 For Students
- **Secured Registration**: Integrated domain validation checks (e.g., matching institutional domains) and master list validation to prevent unauthorized access.
- **Optimized 4-Request Lifecycle**: Operates the entire exam lifecycle under exactly 4 backend requests:
  1. `POST /api/users/login` – Validates user credentials, identifies college affiliation, and loads student dashboard status in one call.
  2. `POST /api/users/register` – Registers/starts the exam, loads questions, and returns active test configurations in one payload.
  3. `POST /api/users/submit` – Submits the exam and calculates the scores.
  4. `GET /api/users/result/:examId/:rollNumber` – Loads results, detailed scores, and correct answers.
- **Fail-safe Session Restoration**: Prevents progress loss during power cuts or browser refreshes by automatically restoring the active exam state from local storage.
- **Dynamic Section Navigation**: Segmented questions with visual progress bars.
- **Professional PDF Generation**: Clean client-side generation of answer keys matching the student's exam name and containing a list of all included sections.

### 🛠️ For Administrators
- **Comprehensive Leaderboards**: Live standings showing student ranks, timestamps, and scores.
- **Per-Question Analytics**: Graphical breakdown showing accuracy metrics per question to help instructors identify difficult topics.
- **Question Bank Manager**: Add, edit, delete, or bulk-import questions from CSV files.
- **Global Settings Controls**: Dynamically adjust exam start and end times, clear user data, and clean up the database for new cycles.

---

## Technologies Used

The application is built using a modern, lightweight, and dependency-conscious tech stack:

### Backend
- **Node.js**: Asynchronous event-driven JavaScript runtime environment.
- **Express.js**: Fast, minimalist web framework for building optimized RESTful API routes.

### Database
- **MongoDB**: NoSQL database for flexible and scalable storage of exams, questions, and student submission details.
- **Mongoose ODM**: Schemas and object modeling to manage database relationships and query validation.

### Frontend
- **HTML5 & Vanilla JavaScript**: Standard web components and interactive logic without heavy frameworks.
- **Vanilla CSS & Tailwind CSS**: Curated Tailwind utilities for modern UI layouts (such as the results page and analytics dashboard) combined with custom CSS.
- **Chart.js**: Client-side interactive canvas charts mapping score distributions and question difficulty curves.
- **jsPDF & jsPDF-AutoTable**: High-performance, client-side PDF rendering library used to generate structured, professional exam reports and answer keys.

### Core Utilities & Security
- **CORS & Dotenv**: Environment configuration isolation and cross-origin security.
- **CSV-Parser**: Stream processing of CSV data during bulk question uploads.

---

## Project Structure

```
Let's Test/
├── config/
│   └── db.js                 # Database connection & Google DNS fallback override
├── controllers/
│   ├── adminController.js    # Leaderboards, question management, analytics logic
│   ├── questionController.js # Questions utility endpoints
│   └── userController.js     # User authentication, registration, submission, results
├── middleware/
│   └── adminAuth.js          # Admin authorization protection checks
├── models/
│   ├── College.js            # College schema (domain names, settings)
│   ├── Exam.js               # Exam details schema (times, settings)
│   ├── Question.js           # Question schema (section, choices, answers)
│   ├── Student.js            # Master list of student enrollments
│   └── User.js               # Submissions schema (scores, timestamp, user answers)
├── public/
│   ├── css/
│   │   └── style.css         # Modern, custom global stylesheets
│   ├── js/
│   │   ├── admin.js          # Admin console controller logic
│   │   ├── api.js            # Shared fetch client for optimized REST calls
│   │   ├── register.js       # Register page UI controller
│   │   ├── result.js         # Result charts and jsPDF generation handler
│   │   └── test.js           # Active test runner with sessionStorage restoration
│   ├── admin.html            # Admin panel UI
│   ├── index.html            # Registration/Login portal UI
│   ├── result.html           # Professional visual performance sheet UI
│   └── test.html             # Main examination viewport UI
├── routes/
│   ├── adminRoutes.js        # Admin routes configuration
│   ├── questionRoutes.js     # Question fetching endpoints
│   └── userRoutes.js         # User registration, submit, and metrics endpoints
├── .env.example              # Sample environment configuration file
├── package.json              # App packages configurations
├── sample_questions.csv      # Initial data template for bulk uploads
└── server.js                 # Entrypoint server file
```

---

## Setup Instructions

### Prerequisites
1. **Node.js** (v16.x or higher recommended)
2. **MongoDB** (Local instance or MongoDB Atlas account)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd "Let's Test"
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/testdb?retryWrites=true&w=majority
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Seed sample data (Optional):**
   Run the db setup script (if any) or import questions via the Admin Panel at `/admin`.

5. **Start the application:**
   ```bash
   # Production mode
   npm start

   # Development mode (with live reload)
   npm run dev
   ```

6. **Access App:**
   - Student Portal: `http://localhost:3000`
   - Admin Panel: `http://localhost:3000/admin`

---

## Core API Design

### User & Examination Lifecycle (`/api/users`)
- `POST /login`: Receives credentials, identifies domain/college, and fetches dashboards status in one request.
- `POST /register`: Registers an active attempt and fetches all question papers and rules simultaneously.
- `POST /submit`: Processes final selected answers, calculates score stats, and locks the exam session.
- `GET /result/:examId/:rollNumber`: Returns aggregated test performance metrics.

### Admin Tools (`/api/admin`)
- `GET /leaderboard`: Lists rankings and completion times.
- `GET /analytics`: Maps accuracy per question.
- `POST /questions/bulk`: Imports tabular CSV question lists directly into MongoDB.

---

## Commonly Asked Viva Questions

### Architectural & Optimization Concepts
1. **Q: Why was the API design optimized to use only 4 request lifecycles?**
   - **Answer**: By combining operations (e.g., retrieving college configurations and student dashboards during login; fetching exam status and papers during registration), we reduce database load, network handshakes, and application response times. This makes the application highly scalable on a free hosting tier.

2. **Q: How does the application handle page refreshes or network loss during tests?**
   - **Answer**: The application utilizes client-side `sessionStorage` to store current question selections and exam status. When the test page reloads, the script validates the state locally first before restoring the layout. If the browser is closed entirely, the backend `/register` endpoint returns the registered user's previous progress to resume the attempt securely.

3. **Q: How is the Answer Key PDF generated?**
   - **Answer**: The report card PDF is built client-side using `jsPDF` and `jsPDF-AutoTable`. This removes processing overhead from the backend server. The document automatically adapts to display the exam name in its download filename and lists the specific sections included in the test.

4. **Q: Explain the role of Mongoose validation rules used in this app.**
   - **Answer**: Mongoose enforces type integrity, document relations (e.g., binding a `User` attempt to an `Exam` and `College` via ObjectID refs), and unique constraint indexes to prevent duplicate attempts (checking combination of `rollNumber` and `examId`).
