import test from "node:test";
import assert from "node:assert/strict";
import { createStudyPlanRequest, createSyllabusRequest, normalizeSubjectList } from "./studyPlanForm.js";

test("subject add/submit normalization trims values and rejects blanks and duplicates", () => {
  assert.deepEqual(normalizeSubjectList(["Maths"], " maths "), ["Maths"]);
  assert.deepEqual(normalizeSubjectList(["Physics", ""], " Chemistry "), ["Physics", "Chemistry"]);
  assert.deepEqual(normalizeSubjectList([], "   "), []);
});

test("syllabus request uses its own form and includes a typed subject even before plus is clicked", () => {
  const request = createSyllabusRequest(
    { examTarget: "GATE", stream: "Engineering", subjects: [] },
    "Maths"
  );
  assert.deepEqual(request, { examTarget: "GATE", stream: "Engineering", subjects: ["Maths"] });
});

test("study-plan and syllabus requests retain independent subjects and schedule fields", () => {
  const planForm = { examTarget: "JEE Main", stream: "Engineering", subjects: ["Physics"], durationWeeks: 8, hoursPerDay: 2 };
  const syllabusForm = { examTarget: "GATE", stream: "Engineering", subjects: ["Maths"] };
  const planRequest = createStudyPlanRequest(planForm, "Chemistry");
  const syllabusRequest = createSyllabusRequest(syllabusForm);

  assert.deepEqual(planRequest.subjects, ["Physics", "Chemistry"]);
  assert.deepEqual(syllabusRequest, { examTarget: "GATE", stream: "Engineering", subjects: ["Maths"] });
  assert.equal(planRequest.durationWeeks, 8);
  assert.equal(planRequest.hoursPerDay, 2);
  assert.deepEqual(planForm.subjects, ["Physics"]);
  assert.deepEqual(syllabusForm.subjects, ["Maths"]);
});
