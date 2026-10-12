export const normalizeSubjectList = (subjects = [], pendingSubject = "") => {
  const seen = new Set();
  return [...subjects, pendingSubject].reduce((result, subject) => {
    const value = String(subject || "").trim();
    const key = value.toLocaleLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
    return result;
  }, []);
};

export const createStudyPlanRequest = (form, pendingSubject = "") => ({
  ...form,
  subjects: normalizeSubjectList(form.subjects, pendingSubject),
});

export const createSyllabusRequest = (form, pendingSubject = "") => ({
  examTarget: form.examTarget,
  stream: form.stream,
  subjects: normalizeSubjectList(form.subjects, pendingSubject),
});
