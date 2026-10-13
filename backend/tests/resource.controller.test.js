const test = require("node:test");
const assert = require("node:assert/strict");

let resourceRecord;
let createdRecord;
let queriedFilter;
let lookedUpId;
let deleted = false;

const mockModel = (relativePath, exports) => {
  const id = require.resolve(relativePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

mockModel("../src/models/resource.model", {
  create: async (document) => { createdRecord = document; return { _id: "resource-new", ...document }; },
  findOne: async (filter) => {
    queriedFilter = filter;
    return resourceRecord && String(resourceRecord.uploadedBy) === String(filter.uploadedBy) ? resourceRecord : null;
  },
  findById: async (id) => { lookedUpId = id; return resourceRecord; },
});
mockModel("../src/models/user.model", {});
mockModel("../src/config/cloudinary", {
  cloudinary: { uploader: { destroy: async () => ({ result: "ok" }) } },
  isCloudinaryConfigured: () => false,
});

const controller = require("../src/controllers/resource.controller");
const call = (handler, { body = {}, params = {}, file, user = { _id: "teacherA", role: "teacher" } } = {}) =>
  new Promise((resolve) => {
    const req = { body, params, file, user };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(payload) { resolve({ status: this.statusCode, payload }); } };
    handler(req, res, (error) => resolve({ status: error?.statusCode || 500, error }));
  });

test.beforeEach(() => {
  resourceRecord = null;
  createdRecord = null;
  queriedFilter = null;
  lookedUpId = null;
  deleted = false;
});

test("resource upload always stores the authenticated teacher as owner", async () => {
  const { status } = await call(controller.uploadResource, {
    body: { title: "Shared notes", type: "link", linkUrl: "https://example.com", uploadedBy: "teacherB" },
  });
  assert.equal(status, 201);
  assert.equal(createdRecord.uploadedBy, "teacherA");
});

test("teacher can update only their own resource and cannot transfer ownership", async () => {
  resourceRecord = {
    _id: "resourceA", uploadedBy: "teacherA", title: "Old notes", description: "", type: "link",
    linkUrl: "https://old.example", fileUrl: "", fileSize: 0, storageProvider: "", storagePublicId: "", storageResourceType: "",
    save: async function () { this.saved = true; },
  };
  const { status } = await call(controller.updateResource, {
    params: { id: "resourceA" }, body: { title: "Updated notes", linkUrl: "https://new.example", uploadedBy: "teacherB" },
  });
  assert.equal(status, 200);
  assert.deepEqual(queriedFilter, { _id: "resourceA", uploadedBy: "teacherA" });
  assert.equal(resourceRecord.title, "Updated notes");
  assert.equal(resourceRecord.uploadedBy, "teacherA");
  assert.equal(resourceRecord.saved, true);
});

test("teacher cannot update another teacher's resource", async () => {
  resourceRecord = { _id: "resourceB", uploadedBy: "teacherB" };
  const { status } = await call(controller.updateResource, { params: { id: "resourceB" }, body: { title: "Hijacked" } });
  assert.equal(status, 404);
  assert.deepEqual(queriedFilter, { _id: "resourceB", uploadedBy: "teacherA" });
});

test("teacher cannot delete another teacher's resource by changing its ID", async () => {
  resourceRecord = { _id: "resourceB", uploadedBy: "teacherB", deleteOne: async () => { deleted = true; } };
  const { status } = await call(controller.deleteResource, { params: { id: "resourceB" } });
  assert.equal(status, 403);
  assert.equal(lookedUpId, "resourceB");
  assert.equal(deleted, false);
});
