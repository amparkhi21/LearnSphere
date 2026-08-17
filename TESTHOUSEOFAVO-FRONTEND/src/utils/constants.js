export const STREAMS = ["Engineering", "Medical", "Commerce", "Arts", "Science", "Law", "Design"];

export const EXAM_TAGS = ["JEE Main", "JEE Advanced", "NEET", "CAT", "UPSC", "CLAT", "GATE", "Board Exams"];

export const LEVELS = ["beginner", "intermediate", "advanced"];

export const RESOURCE_TYPES = ["pdf", "note", "video", "link", "image"];

export const DIFFICULTIES = ["easy", "medium", "hard"];

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
