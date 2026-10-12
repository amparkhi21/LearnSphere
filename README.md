# 🎓 LearnSphere — AI-Powered Learning Platform

**Learn Smarter. Practice Better. Grow Faster.**

LearnSphere is a full-stack learning platform designed to help students improve their learning experience through structured study resources, topic-based practice, and AI-powered quiz generation. The platform aims to make learning more interactive by allowing students to practice questions, evaluate their understanding, and identify areas for improvement.

Built using modern web technologies, LearnSphere combines full-stack development with AI integration to create an interactive and personalized learning experience.

> **Project Status:** 🚧 In Development

## 🌟 Live Demo

- **Frontend:** [LearnSphere](https://learnsphere-tau-eight.vercel.app/)
- **Backend API:** [LearnSphere Backend](https://learnsphere-rpwf.onrender.com)

*Some features, particularly AI-generated quizzes, may require valid API configuration and may still be under development.*

## 📌 Problem Statement

Students often rely on multiple platforms for study materials, practice questions, and self-assessment. Finding relevant practice questions for a particular topic and evaluating their own understanding can be time-consuming.

LearnSphere aims to address this challenge by bringing learning resources and interactive quizzes together in one platform, with AI-assisted question generation to support topic-focused practice.

## 💡 Proposed Solution

LearnSphere provides a centralized learning environment where students can explore learning topics, practice multiple-choice questions, and use AI-powered question generation when the required AI service is configured.

The platform is designed to make self-learning more accessible, interactive, and efficient.

## ✨ Key Features

### 📚 Learning & Study Support
- Centralized learning platform
- Topic-based study and practice
- Organized learning content
- Easy access to practice activities

### 🤖 AI-Powered Quiz Generation
- AI-assisted question generation based on selected topics
- Multiple-choice questions (MCQs)
- Multiple answer options for each question
- Topic-focused practice sessions
- Configurable AI provider integration

*AI-generated questions depend on a properly configured and available AI API. This functionality is currently being improved.*

### 📝 Interactive Quiz Experience
- Attempt multiple-choice questions
- Select answers and evaluate understanding
- Practice subject-specific questions
- Review quiz results where supported by the current implementation

### 📊 Learning Improvement
- Practice-based learning
- Self-assessment through quizzes
- Opportunities to identify weak topics
- Foundation for future learning progress tracking

### 🔐 Backend & API Integration
- REST API architecture
- Frontend-to-backend communication
- Environment-based configuration
- Database integration for application data
- AI service integration for question generation

## 🧰 Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Interactive frontend |
| Vite | Frontend development and build tooling |
| Tailwind CSS | Responsive user interface styling |
| JavaScript | Application logic |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB | Database and application data storage |
| AI API integration | AI-assisted quiz generation |
| Git & GitHub | Version control and project collaboration |
| Vercel | Frontend deployment |
| Render | Backend deployment |

## 🏗️ System Architecture

```text
              STUDENT
                 |
                 v
         React.js Frontend
                 |
                 v
         Node.js + Express
                 |
          +------+------+
          |             |
          v             v
       MongoDB        AI API
          |             |
          v             v
    Learning Data   Quiz Generation
          |             |
          +------+------+
                 |
                 v
       Interactive Learning
          and Quiz Results
```

### Architecture Overview

- **React.js:** Provides the user interface for browsing learning content and interacting with quizzes.
- **Node.js and Express.js:** Handle backend APIs and application logic.
- **MongoDB:** Stores application data as defined by the implemented data models.
- **AI API:** Supports automatic question generation when the configured provider is available.
- **Vercel and Render:** Host the frontend and backend components.

## 📂 Project Structure

The project is organized into frontend and backend modules.

```text
LearnSphere/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   └── package.json
│
├── README.md
└── .gitignore
```

*This is a representative structure. Adjust the folder names to match the actual files in your repository.*


### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd LearnSphere
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your actual repository URL.

### 2. Set Up the Backend

Open a terminal in the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file using the environment variables required by your backend. Refer to `.env.example` if available.

Example configuration:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

Use only the variables supported by your actual backend code. Configure the required database connection and AI provider credentials before starting the application.

Start the backend:

```bash
npm run dev
```

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the frontend environment file according to your application. For a Vite project, the backend URL is commonly configured as:

```env
VITE_API_URL=http://localhost:5000
```

Use the exact environment variable name expected by your frontend code.

Start the frontend:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173`.

### 4. Configure AI Quiz Generation

LearnSphere's quiz-generation feature depends on a working AI provider configuration.

To enable AI-generated questions:

1. Configure the API key supported by the backend.
2. Verify that the key is available in the deployed or local environment.
3. Confirm that the backend calls the correct AI provider endpoint.
4. Test quiz generation with a sample topic.
5. Verify that the response contains valid questions, options, and answers.

Never commit API keys or other secrets to GitHub.

## 🔄 Application Workflow

1. The student opens the LearnSphere platform.
2. The student selects a learning topic or practice area.
3. The frontend sends the required request to the backend.
4. The backend retrieves relevant data or calls the configured AI provider.
5. AI-generated questions are returned when the integration succeeds.
6. The student attempts the quiz and checks the available results.

The exact workflow depends on the features implemented in the current version.


## 🎯 Project Objectives

LearnSphere is being developed to demonstrate practical skills in:

- Full-stack web application development
- React.js frontend development
- REST API development using Node.js and Express.js
- Database integration using MongoDB
- Third-party AI API integration
- Environment configuration and API error handling
- Deployment and debugging of full-stack applications

## 🔮 Future Enhancements

Potential improvements include personalized learning recommendations, adaptive quizzes, topic-wise progress analytics, additional learning resources, detailed performance reports, and support for more AI providers.

## 👩‍💻 Author

**Parkhi Kumari**

B.Tech Computer Science and Engineering — AI & Data Science

Interested in Full-Stack Development, Artificial Intelligence, and Software Engineering.

---

⭐ **LearnSphere — Making Learning More Interactive and Accessible.**
