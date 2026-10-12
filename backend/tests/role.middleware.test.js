const test = require("node:test");
const assert = require("node:assert/strict");
const restrictTo = require("../src/middlewares/role.middleware");

const invoke = (middleware, user) => {
  let nextCalled = false;
  middleware({ user }, {}, () => { nextCalled = true; });
  return nextCalled;
};

test("teacher and admin roles pass the explicit Live Classes manager policy", () => {
  const allowClassManagement = restrictTo("teacher", "admin");
  assert.equal(invoke(allowClassManagement, { _id: "teacherA", role: "teacher" }), true);
  assert.equal(invoke(allowClassManagement, { _id: "adminA", role: "admin" }), true);
});

test("student role remains blocked from teacher-only Live Classes actions", () => {
  const allowClassManagement = restrictTo("teacher", "admin");
  assert.throws(
    () => invoke(allowClassManagement, { _id: "studentA", role: "student" }),
    (error) => error.statusCode === 403 && error.message === "You do not have permission to perform this action"
  );
});

