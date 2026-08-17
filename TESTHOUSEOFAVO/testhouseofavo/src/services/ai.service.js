const fetch = require("node-fetch");

/**
 * AI Service
 * ----------
 * Supports two free-tier providers, chosen via AI_PROVIDER in .env:
 *  - "gemini" -> Google Gemini (free tier): https://aistudio.google.com/app/apikey
 *  - "groq"   -> Groq (free, fast Llama 3 models): https://console.groq.com/keys
 *
 * If no API key is configured, falls back to a deterministic template
 * generator so the app is still fully demo-able with zero setup/cost.
 */

const PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

const isAIConfigured = () => {
  if (PROVIDER === "gemini") return !!process.env.GEMINI_API_KEY;
  if (PROVIDER === "groq") return !!process.env.GROQ_API_KEY;
  return false;
};

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini API error");
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text;
}

async function callGroq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You always respond with valid JSON only, no markdown fences." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Groq API error");
  return data?.choices?.[0]?.message?.content;
}

async function generateJSON(prompt) {
  if (!isAIConfigured()) return null; // caller should use fallback

  const raw = PROVIDER === "groq" ? await callGroq(prompt) : await callGemini(prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ---------- Feature: Syllabus / Study Plan Generation ----------
async function generateStudyPlan({ examTarget, stream, subjects, durationWeeks, hoursPerDay }) {
  const prompt = `Create a personalized ${durationWeeks}-week study plan for a student preparing for "${examTarget}" (stream: ${stream}), studying ${hoursPerDay} hours/day, covering subjects: ${subjects.join(", ")}.
Return ONLY valid JSON in this exact shape:
{
  "syllabus": [{ "subject": "string", "topics": ["string"] }],
  "weeklyPlan": [{ "week": 1, "focus": "string", "tasks": ["string"] }]
}`;

  try {
    const result = await generateJSON(prompt);
    if (result) return result;
  } catch (err) {
    console.warn("AI study plan generation failed, using fallback:", err.message);
  }

  // Deterministic fallback (no API key / API failure) so the feature never breaks
  const syllabus = subjects.map((subject) => ({
    subject,
    topics: [`${subject} - Foundations`, `${subject} - Core Concepts`, `${subject} - Advanced Problems`, `${subject} - Previous Year Questions`],
  }));

  const weeklyPlan = Array.from({ length: durationWeeks }, (_, i) => {
    const subject = subjects[i % subjects.length];
    return {
      week: i + 1,
      focus: `${subject} deep-dive + revision`,
      tasks: [
        `Study core ${subject} chapters (${hoursPerDay}h/day)`,
        `Solve 20 practice questions on ${subject}`,
        `Revise previous week's weak topics`,
        i % 4 === 3 ? "Take a full-length mock test" : "Group discussion / doubt clearing session",
      ],
    };
  });

  return { syllabus, weeklyPlan };
}

// ---------- Feature: Practice Question Generation ----------
async function generateQuizQuestions({ subject, topic, difficulty, count = 5 }) {
  const prompt = `Generate ${count} multiple-choice questions for subject "${subject}"${topic ? `, topic "${topic}"` : ""}, difficulty "${difficulty}".
Return ONLY valid JSON in this exact shape:
{
  "questions": [
    {
      "questionText": "string",
      "options": ["string", "string", "string", "string"],
      "correctOptionIndex": 0,
      "explanation": "string"
    }
  ]
}`;

  try {
    const result = await generateJSON(prompt);
    if (result?.questions?.length) return result.questions;
  } catch (err) {
    console.warn("AI quiz generation failed, using fallback:", err.message);
  }

  // Fallback template questions
  return Array.from({ length: count }, (_, i) => ({
    questionText: `[Sample] ${subject}${topic ? ` - ${topic}` : ""} practice question #${i + 1}. (Configure GEMINI_API_KEY or GROQ_API_KEY for real AI-generated questions.)`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctOptionIndex: 0,
    explanation: "Add an AI provider key in .env to generate real explanations.",
  }));
}

// ---------- Feature: Resource Recommendations ----------
async function recommendResources({ subject, examTarget, recentTopics = [] }) {
  const prompt = `A student is preparing for "${examTarget}", currently studying "${subject}", recent topics: ${recentTopics.join(", ") || "N/A"}.
Suggest 5 specific, actionable learning resource ideas (not real URLs, just clear titles/descriptions of what to look for).
Return ONLY valid JSON: { "suggestions": ["string", "string", "string", "string", "string"] }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.suggestions?.length) return result.suggestions;
  } catch (err) {
    console.warn("AI resource recommendation failed, using fallback:", err.message);
  }

  return [
    `${subject} NCERT/standard textbook - core chapters`,
    `${subject} previous 5 years' ${examTarget} question papers`,
    `${subject} formula sheet / quick revision notes`,
    `Top-rated YouTube playlist for ${subject} (${examTarget} focused)`,
    `Peer-shared notes in the ${subject} community on this platform`,
  ];
}

// ---------- Feature: Course Outline Generation (for teachers) ----------
async function generateCourseOutline({ title, subject, level }) {
  const prompt = `A teacher wants to create a course titled "${title}" for subject "${subject}", level "${level}".
Generate a structured course outline with 4-6 modules.
Return ONLY valid JSON: { "modules": [{ "title": "string", "description": "string" }] }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.modules?.length) return result.modules;
  } catch (err) {
    console.warn("AI course outline generation failed, using fallback:", err.message);
  }

  return [
    { title: `Introduction to ${subject}`, description: "Foundational concepts and course overview." },
    { title: `Core ${subject} Concepts`, description: "Deep dive into the main topics." },
    { title: "Practice & Problem Solving", description: "Applied exercises and problem sets." },
    { title: "Advanced Topics", description: "Higher-order concepts and edge cases." },
    { title: "Revision & Mock Assessment", description: "Full revision plus a final assessment." },
  ];
}

// ---------- Feature: Doubt Assistance (AI answer suggestion) ----------
async function assistDoubt({ question, subject }) {
  const prompt = `A student asked this doubt in subject "${subject || "General"}": "${question}"
Provide a clear, helpful, step-by-step explanation a peer or AI assistant could post as an answer (max 150 words).
Return ONLY valid JSON: { "answer": "string" }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.answer) return result.answer;
  } catch (err) {
    console.warn("AI doubt assistance failed, using fallback:", err.message);
  }

  return "This is a placeholder AI answer. Configure GEMINI_API_KEY or GROQ_API_KEY in your .env file to get real AI-generated explanations for student doubts.";
}

module.exports = {
  isAIConfigured,
  generateStudyPlan,
  generateQuizQuestions,
  recommendResources,
  generateCourseOutline,
  assistDoubt,
};
