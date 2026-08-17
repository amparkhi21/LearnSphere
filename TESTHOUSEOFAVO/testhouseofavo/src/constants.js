module.exports = {
  ROLES: {
    STUDENT: "student",
    TEACHER: "teacher",
    ADMIN: "admin",
  },

  COURSE_STATUS: {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
  },

  COURSE_LEVEL: {
    BEGINNER: "beginner",
    INTERMEDIATE: "intermediate",
    ADVANCED: "advanced",
  },

  PAYMENT_STATUS: {
    PENDING: "pending",
    SUCCESS: "success",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  RESOURCE_TYPE: {
    PDF: "pdf",
    NOTE: "note",
    VIDEO: "video",
    LINK: "link",
    IMAGE: "image",
  },

  QUIZ_DIFFICULTY: {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
  },

  NOTIFICATION_TYPE: {
    ENROLLMENT: "enrollment",
    COMMENT: "comment",
    ANSWER: "answer",
    SYSTEM: "system",
    PAYMENT: "payment",
  },

  DEFAULT_PAGE_SIZE: 12,
  MAX_UPLOAD_SIZE_MB: 20,
};
