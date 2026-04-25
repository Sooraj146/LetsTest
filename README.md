# AptitudePro - Online Assessment Web App

A production-ready full-stack web application for conducting online aptitude tests.

## Features Built
- **Modern UI**: Built with a stunning dark theme using Tailwind CSS and custom animations.
- **Frontend**: Vanilla JavaScript (no framework overhead), modular files, fully responsive.
- **Backend**: Node.js and Express API, properly structured with routes and controllers.
- **Database**: MongoDB integration using Mongoose, with models for Users and Questions.
- **Security**: Duplicate roll number checks, API validations, and anti-resubmission logic. State is saved in localStorage to prevent data loss on refresh.

## Setup Instructions (Local)

1. **Prerequisites**
   - Install Node.js
   - Get a MongoDB connection string (e.g., from MongoDB Atlas)

2. **Environment Setup**
   - Rename `.env.example` to `.env`
   - Inside `.env`, paste your MongoDB connection string in the `MONGO_URI` variable.
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/aptitudedb?retryWrites=true&w=majority
   ```

3. **Install Dependencies**
   Open your terminal in the project directory and run:
   ```bash
   npm install
   ```

4. **Seed the Database**
   To load the 30 default questions into your database, run:
   ```bash
   node scripts/seed.js
   ```

5. **Upload the Answer Key PDF**
   Place your `answer_key.pdf` inside the `public/assets/` directory.

6. **Start the Server**
   ```bash
   npm start
   # OR for development with auto-restart:
   npm run dev
   ```

7. **Access the App**
   Open your browser and navigate to `http://localhost:3000`

## Deployment

The application is designed to be easily deployable to platforms like Render, Railway, Heroku, or Vercel.

1. Create a new Web Service on your chosen platform.
2. Connect your GitHub repository.
3. Set the Build Command to `npm install`.
4. Set the Start Command to `npm start`.
5. Add the Environment Variables (`PORT`, `MONGO_URI`) in the platform's dashboard.
6. Deploy!
