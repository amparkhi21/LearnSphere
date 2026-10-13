const test = require("node:test");
const assert = require("node:assert/strict");

let createdCourse;
let existingCourse;

const mockModel = (relativePath, exports) => {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

mockModel("../src/models/course.model", {
  create: async (document) => { createdCourse = document; return { _id: "course-new", ...document }; },
  findById: async () => existingCourse,
});
mockModel("../src/config/cloudinary", {
  cloudinary: { uploader: { destroy: async () => ({ result: "ok" }) } },
  isCloudinaryConfigured: () => false,
});

const controller = require("../src/controllers/course.controller");
const call = (handler, { body = {}, params = {}, user = { _id: "teacherA", role: "teacher" } } = {}) =>
  new Promise((resolve) => {
    const req = { body, params, user };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(payload) { resolve({ status: this.statusCode, payload }); } };
    handler(req, res, (error) => resolve({ status: error?.statusCode || 500, error }));
  });

test.beforeEach(() => {
  createdCourse = null;
  existingCourse = null;
});

test("course creation ignores submitted owner and thumbnail URLs", async () => {
  const { status } = await call(controller.createCourse, {
    body: { title: "Algorithms", description: "Basics", teacher: "teacherB", thumbnail: "https://untrusted.example/image.jpg", modules: "[]" },
  });
  assert.equal(status, 201);
  assert.equal(createdCourse.teacher, "teacherA");
  assert.equal(createdCourse.thumbnail, undefined);
  assert.deepEqual(createdCourse.modules, []);
});

test("course edits without a new thumbnail preserve the existing image and owner", async () => {
  existingCourse = {
    _id: "courseA", teacher: "teacherA", title: "Old title", thumbnail: "https://cdn.example/cover.jpg", thumbnailPublicId: "courses/cover",
    save: async function () { this.saved = true; },
  };
  const { status } = await call(controller.updateCourse, {
    params: { id: "courseA" }, body: { title: "New title", teacher: "teacherB", thumbnail: "https://attacker.example/cover.jpg", thumbnailPublicId: "other/image" },
  });
  assert.equal(status, 200);
  assert.equal(existingCourse.teacher, "teacherA");
  assert.equal(existingCourse.thumbnail, "https://cdn.example/cover.jpg");
  assert.equal(existingCourse.thumbnailPublicId, "courses/cover");
  assert.equal(existingCourse.title, "New title");
});

test("another teacher cannot update a course thumbnail or course fields", async () => {
  existingCourse = { _id: "courseA", teacher: "teacherA", title: "Owned", save: async () => {} };
  const { status } = await call(controller.updateCourse, {
    params: { id: "courseA" }, body: { title: "Changed" }, user: { _id: "teacherB", role: "teacher" },
  });
  assert.equal(status, 403);
  assert.equal(existingCourse.title, "Owned");
});
