import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderText, isValidQuestion, isValidQuiz, assertValidQuiz,
  filterDisplayableQuizzes, clampQuestionCount, INVALID_QUIZ_MESSAGE,
} from "./quizValidation.js";

const goodQ = (i = 1) => ({ _id: `q${i}`, questionText: `What is the SI unit of force (question ${i})?`, options: ["Newton", "Joule", "Watt", "Pascal"] });
const goodQuiz = { _id: "quiz1", subject: "Physics", title: "Physics Practice Quiz", questions: [goodQ(1), goodQ(2)] };

// The exact payload the OLD backend fallback produced and saved
const oldFakeQuestion = {
  _id: "fake1",
  questionText: "[Sample] Physics - Mechanics practice question #1. (Configure GEMINI_API_KEY or GROQ_API_KEY for real AI-generated questions.)",
  options: ["Option A", "Option B", "Option C", "Option D"],
};

test("real AI-style questions are valid", () => {
  assert.ok(isValidQuestion(goodQ()));
  assert.ok(isValidQuiz(goodQuiz));
  assert.equal(assertValidQuiz(goodQuiz), goodQuiz);
});

test("the old fake-sample / API-key-message question is rejected", () => {
  assert.equal(isPlaceholderText(oldFakeQuestion.questionText), true);
  assert.equal(isValidQuestion(oldFakeQuestion), false);
  assert.equal(isValidQuiz({ ...goodQuiz, questions: [oldFakeQuestion] }), false);
  assert.equal(isValidQuiz({ ...goodQuiz, questions: [goodQ(), oldFakeQuestion] }), false, "one bad question poisons the quiz");
  assert.throws(() => assertValidQuiz({ ...goodQuiz, questions: [oldFakeQuestion] }), { message: INVALID_QUIZ_MESSAGE });
});

test("legitimate questions that merely mention API keys are NOT rejected", () => {
  const q = { _id: "k", questionText: "Why should an API key never be committed to a public repository?", options: ["Anyone can misuse it", "It slows git", "It breaks CI", "Nothing happens"] };
  assert.equal(isPlaceholderText(q.questionText), false);
  assert.ok(isValidQuestion(q));
});

test("error objects / raw responses / garbage are never treated as a quiz", () => {
  for (const bad of [null, undefined, "", "Error: boom", 42, [], {}, { message: "Something went wrong" },
    { success: false, message: "Configure GEMINI_API_KEY", errors: [] },
    { _id: "x", questions: [] }, { _id: "x", questions: "nope" }, { questions: [goodQ()] }]) {
    assert.equal(isValidQuiz(bad), false, JSON.stringify(bad));
  }
});

test("malformed questions are rejected", () => {
  assert.equal(isValidQuestion({ ...goodQ(), options: ["only one"] }), false);
  assert.equal(isValidQuestion({ ...goodQ(), options: ["a", "", "c", "d"] }), false);
  assert.equal(isValidQuestion({ ...goodQ(), options: "not an array" }), false);
  assert.equal(isValidQuestion({ ...goodQ(), questionText: "   " }), false);
  assert.equal(isValidQuestion({ ...goodQ(), _id: undefined }), false);
  assert.equal(isValidQuestion(null), false);
});

test("filterDisplayableQuizzes hides leftover placeholder quizzes but keeps real ones", () => {
  const list = [
    { _id: "1", title: "Real quiz", questions: [goodQ()] },
    { _id: "2", title: "Fake", questions: [oldFakeQuestion] },
    { _id: "3", title: "Physics - Mechanics Practice Quiz", questions: [{ questionText: "[Sample] x" }] },
    null,
    { title: "no id" },
    { _id: "4", title: "Quiz without questions array" },
  ];
  assert.deepEqual(filterDisplayableQuizzes(list).map((q) => q._id), ["1", "4"]);
  assert.deepEqual(filterDisplayableQuizzes(undefined), []);
});

test("clampQuestionCount keeps the count in range and handles junk", () => {
  assert.equal(clampQuestionCount(5), 5);
  assert.equal(clampQuestionCount(1), 3);
  assert.equal(clampQuestionCount(100), 15);
  assert.equal(clampQuestionCount("8"), 8);
  assert.equal(clampQuestionCount(""), 3, "empty string coerces to 0 -> clamped to min");
  assert.equal(clampQuestionCount(NaN), 5);
  assert.equal(clampQuestionCount(undefined), 5);
  assert.equal(clampQuestionCount(7.6), 8);
});
