const test = require("node:test");
const assert = require("node:assert/strict");

const created = [];
let ownedCourse = { _id: "courseA", subject: "Algorithms" };
let liveClassRecord = null;
let enrollmentFound = false;
let studentEnrollments = [];
let listedClasses = [];
let lastCourseFilter = null;
let lastClassFilter = null;
let lastStudentClassFilter = null;
let lastTokenOptions = null;
let updateResults = [];
let updateFilters = [];
let deletedRooms = [];
let lastFindOneFilter = null;

const queryResult = (value) => ({
  select: async () => value,
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const mockModel = (relativePath, exports) => {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

mockModel("../src/models/liveClass.model", {
  create: async (doc) => { created.push(doc); return { _id: "class123", ...doc }; },
  find: (filter) => {
    lastStudentClassFilter = filter;
    return { select() { return this; }, populate() { return this; }, sort: async () => listedClasses };
  },
  findOne: (filter) => { lastFindOneFilter = filter; return queryResult(liveClassRecord); },
  findById: () => queryResult(liveClassRecord),
  findOneAndUpdate: (filter) => { lastClassFilter = filter; updateFilters.push(filter); return queryResult(updateResults.shift() || null); },
  updateOne: async () => {},
});
mockModel("../src/models/course.model", { findOne: async (filter) => { lastCourseFilter = filter; return ownedCourse; } });
mockModel("../src/models/enrollment.model", {
  find: () => ({ select: async () => studentEnrollments }),
  exists: async () => enrollmentFound,
});
class LiveKitConfigurationError extends Error {}
mockModel("../src/services/livekit.service", {
  createRoom: async () => {},
  deleteRoom: async (room) => { deletedRooms.push(room); },
  createParticipantToken: async (args) => { lastTokenOptions = args; return "test-token"; },
  LiveKitConfigurationError,
});

const controller = require("../src/controllers/liveClass.controller");

const call = (handler, { body = {}, params = {}, user = { _id: "teacherA", name: "Teacher A", role: "teacher" } } = {}) =>
  new Promise((resolve) => {
    const req = { body, params, user };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(payload) { resolve({ status: this.statusCode, payload }); } };
    handler(req, res, (error) => resolve({ status: error?.statusCode || 500, error }));
  });

test.beforeEach(() => {
  created.length = 0;
  ownedCourse = { _id: "courseA", subject: "Algorithms" };
  liveClassRecord = null;
  enrollmentFound = false;
  studentEnrollments = [];
  listedClasses = [];
  lastCourseFilter = null;
  lastClassFilter = null;
  lastStudentClassFilter = null;
  lastTokenOptions = null;
  updateResults = [];
  updateFilters = [];
  deletedRooms = [];
  lastFindOneFilter = null;
});

test("teacher scheduling stores authenticated owner and verifies course assignment", async () => {
  const { status, payload } = await call(controller.scheduleClass, {
    body: { title: "Graph Theory", courseId: "courseA", startsAt: new Date(Date.now() + 3600000).toISOString(), durationMinutes: 60 },
  });
  assert.equal(status, 201);
  assert.deepEqual(lastCourseFilter, { _id: "courseA", teacher: "teacherA" });
  assert.equal(created[0].teacher, "teacherA");
  assert.equal(created[0].subject, "Algorithms");
  assert.equal(payload.data._id, "class123");
});

test("admin scheduling is limited to a course assigned to that admin", async () => {
  ownedCourse = { _id: "courseAdmin", subject: "Physics" };
  const { status } = await call(controller.scheduleClass, {
    body: { title: "Admin-owned course class", courseId: "courseAdmin", startsAt: new Date(Date.now() + 3600000).toISOString(), durationMinutes: 45 },
    user: { _id: "adminA", name: "Admin A", role: "admin" },
  });
  assert.equal(status, 201);
  assert.deepEqual(lastCourseFilter, { _id: "courseAdmin", teacher: "adminA" });
  assert.equal(created[0].teacher, "adminA");
});

test("admin cannot schedule a course assigned to another teacher", async () => {
  ownedCourse = null;
  const { status } = await call(controller.scheduleClass, {
    body: { title: "Unauthorized class", courseId: "courseTeacher", startsAt: new Date(Date.now() + 3600000).toISOString(), durationMinutes: 45 },
    user: { _id: "adminA", name: "Admin A", role: "admin" },
  });
  assert.equal(status, 403);
  assert.equal(created.length, 0);
  assert.deepEqual(lastCourseFilter, { _id: "courseTeacher", teacher: "adminA" });
});

test("teacher cannot schedule another teacher's course", async () => {
  ownedCourse = null;
  const { status } = await call(controller.scheduleClass, {
    body: { title: "Unauthorized class", courseId: "courseB", startsAt: new Date(Date.now() + 3600000).toISOString(), durationMinutes: 60 },
  });
  assert.equal(status, 403);
  assert.equal(created.length, 0);
  assert.deepEqual(lastCourseFilter, { _id: "courseB", teacher: "teacherA" });
});

test("schedule rejects timezone-less and invalid-duration requests", async () => {
  const noTimezone = await call(controller.scheduleClass, { body: { title: "Class", courseId: "courseA", startsAt: "2030-01-01T09:00", durationMinutes: 60 } });
  assert.equal(noTimezone.status, 400);
  const badDuration = await call(controller.scheduleClass, { body: { title: "Class", courseId: "courseA", startsAt: new Date(Date.now() + 3600000).toISOString(), durationMinutes: 999 } });
  assert.equal(badDuration.status, 400);
  assert.equal(created.length, 0);
});

test("unenrolled students cannot obtain a token for a live class", async () => {
  liveClassRecord = { _id: "class123", title: "Private class", course: "courseA", teacher: "teacherA", status: "live", roomName: "private-room" };
  const { status } = await call(controller.getJoinToken, { params: { id: "class123" }, user: { _id: "studentA", name: "Student A", role: "student" } });
  assert.equal(status, 403);
});

test("student class listing is restricted to currently enrolled courses and active statuses", async () => {
  studentEnrollments = [{ course: "courseA" }, { course: "courseC" }];
  listedClasses = [{ _id: "class123", course: "courseA", status: "scheduled" }];
  const { status, payload } = await call(controller.getStudentClasses, {
    user: { _id: "studentA", name: "Student A", role: "student" },
  });
  assert.equal(status, 200);
  assert.deepEqual(lastStudentClassFilter, { course: { $in: ["courseA", "courseC"] }, status: { $in: ["scheduled", "live"] } });
  assert.deepEqual(payload.data, listedClasses);
});

test("students without enrollments receive no class records and trigger no broad class query", async () => {
  listedClasses = [{ _id: "private-class", course: "courseB", status: "live" }];
  const { status, payload } = await call(controller.getStudentClasses, {
    user: { _id: "studentA", name: "Student A", role: "student" },
  });
  assert.equal(status, 200);
  assert.deepEqual(payload.data, []);
  assert.equal(lastStudentClassFilter, null);
});

test("enrolled students receive a token scoped to the class room and authenticated identity", async () => {
  enrollmentFound = true;
  liveClassRecord = { _id: "class123", title: "Live class", course: "courseA", teacher: "teacherA", status: "live", roomName: "room-class123" };
  const { status, payload } = await call(controller.getJoinToken, { params: { id: "class123" }, user: { _id: "studentA", name: "Student A", role: "student" } });
  assert.equal(status, 200);
  assert.equal(payload.data.token, "test-token");
  assert.deepEqual(lastTokenOptions, { room: "room-class123", identity: "studentA", name: "Student A", canPublish: true });
});

test("enrolled students cannot get a token before the teacher starts the class", async () => {
  enrollmentFound = true;
  liveClassRecord = { _id: "class123", title: "Upcoming class", course: "courseA", teacher: "teacherA", status: "scheduled", roomName: "" };
  const { status } = await call(controller.getJoinToken, {
    params: { id: "class123" },
    user: { _id: "studentA", name: "Student A", role: "student" },
  });
  assert.equal(status, 409);
  assert.equal(lastTokenOptions, null);
});

test("non-enrolled users cannot probe class status by changing an ID", async () => {
  liveClassRecord = { _id: "class123", title: "Private upcoming class", course: "courseA", teacher: "teacherA", status: "scheduled", roomName: "" };
  const { status } = await call(controller.getJoinToken, {
    params: { id: "class123" },
    user: { _id: "studentB", name: "Student B", role: "student" },
  });
  assert.equal(status, 403);
  assert.equal(lastTokenOptions, null);
});

test("students cannot get a new token after a class has ended", async () => {
  enrollmentFound = true;
  liveClassRecord = { _id: "class123", title: "Ended class", course: "courseA", teacher: "teacherA", status: "completed", roomName: "room-class123" };
  const { status } = await call(controller.getJoinToken, {
    params: { id: "class123" },
    user: { _id: "studentA", name: "Student A", role: "student" },
  });
  assert.equal(status, 409);
  assert.equal(lastTokenOptions, null);
});

test("a different teacher cannot start a class by changing its ID", async () => {
  liveClassRecord = { _id: "class123", teacher: "teacherB", status: "scheduled" };
  const { status } = await call(controller.startClass, { params: { id: "class123" } });
  assert.equal(status, 404);
  assert.deepEqual(lastClassFilter, { _id: "class123", teacher: "teacherA", status: "scheduled" });
});

test("authorized teacher can start their scheduled class", async () => {
  updateResults = [{ _id: "class123" }, { _id: "class123", status: "live" }];
  const { status } = await call(controller.startClass, { params: { id: "class123" } });
  assert.equal(status, 200);
  assert.deepEqual(updateFilters, [
    { _id: "class123", teacher: "teacherA", status: "scheduled" },
    { _id: "class123", teacher: "teacherA", status: "starting" },
  ]);
});

test("authorized teacher can end their live class and removes its room", async () => {
  liveClassRecord = { _id: "class123", teacher: "teacherA", status: "live", roomName: "room-class123", save: async () => {} };
  const { status } = await call(controller.endClass, { params: { id: "class123" } });
  assert.equal(status, 200);
  assert.equal(liveClassRecord.status, "completed");
  assert.ok(liveClassRecord.endedAt instanceof Date);
  assert.deepEqual(lastFindOneFilter, { _id: "class123", teacher: "teacherA" });
  assert.deepEqual(deletedRooms, ["room-class123"]);
});

test("different teacher cannot end another teacher's live class", async () => {
  const { status } = await call(controller.endClass, { params: { id: "class123" } });
  assert.equal(status, 404);
  assert.deepEqual(lastFindOneFilter, { _id: "class123", teacher: "teacherA" });
  assert.deepEqual(deletedRooms, []);
});
