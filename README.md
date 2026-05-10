# MCA Test - Online Assessment Web App

A full-stack web application for conducting online aptitude tests, designed for MCA program entrance, placement activities or internal assessments.

## Table of Contents
- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [How It Works](#how-it-works)
- [Commonly Asked Viva Questions](#commonly-asked-viva-questions)

---

## About the Project

MCA Test is a complete online examination system that allows:
- **Students** to register, take the test, and view their results
- **Administrators** to manage questions, view leaderboards, and analyze test performance

---

## Features

### For Students
- **Registration System**: Enter name, roll number, and college email (@gectcr.ac.in)
- **Resume In-Progress Tests**: Prevents data loss if you accidentally refresh or close the browser
- **Section-wise Question Navigation**: Browse questions by sections
- **Progress Tracking**: Real-time progress bar showing how many questions you've answered
- **Results Page**: View your total score, section-wise scores, and detailed performance analysis

### For Administrators
- **Admin Dashboard** (at `/admin`):
  - View leaderboard with all students ranked by score
  - Per-question analytics (how many students answered correctly/incorrectly)
  - Add, edit, or delete questions
  - Bulk import questions
  - Clear all user data for next test cycle
  - Set test start and end times

### Security & Other Features
- Email domain validation (@gectcr.ac.in only)
- Duplicate roll number and email checks
- Prevent multiple submissions
- Modern dark theme UI with responsive design
- No front-end framework (vanilla JavaScript) for maximum compatibility

---

## Tech Stack

| Layer               | Technology/Library                 |
|---------------------|------------------------------------|
| **Backend**         | Node.js, Express.js                |
| **Database**        | MongoDB (with Mongoose ODM)        |
| **Frontend**        | HTML5, CSS3, Vanilla JavaScript    |
| **Styling**         | Tailwind CSS                       |
| **Other Tools**     | .env (environment variables), cors |

---

## Project Structure

```
MCA Test/
├── config/
│   └── db.js              # MongoDB connection configuration
├── controllers/
│   ├── adminController.js # Admin logic (leaderboard, analytics, question management)
│   ├── questionController.js # Question retrieval
│   └── userController.js  # User registration, test submission, results
├── middleware/
│   └── adminAuth.js       # Admin authentication (placeholder)
├── models/
│   ├── Question.js        # Question schema (section, question, options, correct answer)
│   ├── Settings.js        # Test settings schema (start/end time)
│   └── User.js            # User schema (name, roll number, email, answers, scores)
├── public/
│   ├── css/
│   │   └── style.css      # Custom styles
│   ├── js/
│   │   ├── admin.js       # Admin dashboard logic
│   │   ├── api.js         # API calls helper functions
│   │   ├── register.js    # Registration page logic
│   │   ├── result.js      # Results page logic
│   │   └── test.js        # Test page logic
│   ├── admin.html         # Admin dashboard
│   ├── index.html         # Registration page
│   ├── result.html        # Results page
│   └── test.html          # Test taking page
├── routes/
│   ├── adminRoutes.js     # Admin API routes
│   ├── questionRoutes.js  # Question API routes
│   └── userRoutes.js      # User API routes
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── sample_questions.csv
└── server.js               # Main server file
```

---

## Setup Instructions

### Prerequisites
1. **Node.js**: Install from [nodejs.org](https://nodejs.org/)
2. **MongoDB**: You can use either:
   - **Local MongoDB**: Install from [mongodb.com](https://www.mongodb.com/try/download/community)
   - **MongoDB Atlas** (Cloud): Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

### Step 1: Clone or Download the Project
Download the project files to your computer.

### Step 2: Create Environment Variables
Create a file named `.env` in the root folder of the project. Add the following lines:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string_here
```
Replace `your_mongodb_connection_string_here` with your actual MongoDB connection string.
Example for MongoDB Atlas:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mcatestdb?retryWrites=true&w=majority
```

### Step 3: Install Dependencies
Open a terminal in the project folder and run:
```bash
npm install
```

### Step 4: Seed the Database (Add Sample Questions)
Add some sample questions to your database.

### Step 5: Start the Server
```bash
npm start
```

Or for development mode (auto-restart on code changes):
```bash
npm run dev
```

### Step 6: Access the Application
Open your web browser and go to:
- **Registration Page**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin`

---

## How It Works

### 1. User Flow (Student Taking the Test)
1. **Registration**: Student enters name, roll number, and @gectcr.ac.in email
2. **Validation**: System checks for duplicate roll number/email and valid email domain
3. **Test Page**: Student navigates through questions, selects answers
4. **Submission**: Student submits the test
5. **Results**: System calculates scores and displays the results page

### 2. Data Flow
```
Frontend (HTML/JS) → Express.js Server → MongoDB Database
```

### 3. Key API Endpoints

#### User Endpoints (`/api/users`)
- `POST /register`: Register a new user or resume existing test
- `POST /submit`: Submit the test and calculate scores
- `GET /result/:rollNumber`: Get test results for a roll number
- `GET /settings`: Get test start/end time settings

#### Question Endpoints (`/api/questions`)
- `GET /`: Get all questions (without correct answers)
- `GET /answer-key`: Get all questions with correct answers

#### Admin Endpoints (`/api/admin`)
- `GET /leaderboard`: Get all students ranked by score
- `GET /analytics`: Get per-question analytics
- `GET /questions`: Get all questions (with answers)
- `POST /questions`: Add a new question
- `PUT /questions/:id`: Update a question
- `DELETE /questions/:id`: Delete a question
- `POST /questions/bulk`: Bulk import questions
- `DELETE /users`: Clear all user data
- `DELETE /questions`: Clear all questions
- `GET/UPDATE /settings`: Get/set test start/end times

---

## Commonly Asked Viva Questions

### Basic Concepts
1. **Q: What is Node.js?**
   - Node.js is an open-source, cross-platform JavaScript runtime environment that allows you to run JavaScript on the server-side.

2. **Q: What is Express.js?**
   - Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.

3. **Q: What is MongoDB?**
   - MongoDB is a NoSQL (non-relational) database that stores data in flexible, JSON-like documents.

4. **Q: What is Mongoose?**
   - Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides a schema-based solution to model your application data.

### Project-Specific Questions
5. **Q: Explain the project architecture.**
   - The project follows the **MVC (Model-View-Controller)** pattern:
     - **Models**: Define data schemas (User, Question, Settings)
     - **Views**: HTML files in the `public` folder
     - **Controllers**: Handle business logic and interact with models
     - **Routes**: Define API endpoints and map them to controllers

6. **Q: How is user authentication handled?**
   - Currently, the system uses roll number and email for identification. For admin, there's a placeholder middleware that can be extended with proper authentication.

7. **Q: How are test scores calculated?**
   - When a user submits the test, the system compares each answer with the `correctAnswer` field in the Question model. It calculates total score and section-wise scores.

8. **Q: What prevents a user from submitting the test multiple times?**
   - The User model has an `isSubmitted` boolean field. Once set to true, the system won't allow another submission.

9. **Q: How does the system handle in-progress tests if the browser is closed?**
   - The system checks if a roll number already exists but hasn't submitted the test yet. If so, it allows the user to resume.

10. **Q: What is the purpose of the seed.js script?**
    - The seed script deletes all existing questions and inserts 30 sample questions into the database.

### Technical Questions
11. **Q: What is CORS and why is it used?**
    - CORS (Cross-Origin Resource Sharing) is a security feature that allows or restricts requests from different domains. We use the `cors` middleware to allow requests from our frontend.

12. **Q: What are environment variables and why do we use them?**
    - Environment variables are key-value pairs stored outside the codebase. We use them to store sensitive information like database connection strings and port numbers.

13. **Q: Explain the difference between PUT and POST requests.**
    - **POST**: Used to create a new resource
    - **PUT**: Used to update an existing resource

14. **Q: How is data validated in this project?**
    - Validation happens in multiple places:
      - Mongoose schemas enforce required fields and data types
      - Controllers check for valid email domains, duplicate entries, etc.
      - Frontend has basic HTML validation

15. **Q: What is the purpose of the DNS fix in db.js and server.js?**
    - Some Windows ISPs have issues resolving MongoDB Atlas SRV records. The code forces Google's public DNS servers (8.8.8.8, 8.8.4.4) to fix this issue.

---

## Deployment

The application can be deployed to platforms like:
- **Render**
- **Railway**
- **Heroku**
- **Vercel**

**Steps for Deployment:**
1. Push your code to GitHub
2. Create a new Web Service on your chosen platform
3. Connect your GitHub repository
4. Set Build Command: `npm install`
5. Set Start Command: `npm start`
6. Add Environment Variables (`PORT`, `MONGO_URI`)
7. Deploy!
