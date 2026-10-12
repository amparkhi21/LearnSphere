/**
 * One-off cleanup: remove the fake "[Sample] ... Configure GEMINI_API_KEY ..." quizzes
 * that the old (buggy) generator saved to MongoDB.
 *
 *   npm run cleanup:sample-quizzes             -> DRY RUN (lists what would be deleted)
 *   npm run cleanup:sample-quizzes -- --delete -> actually deletes them (and their attempts)
 *
 * Uses MONGO_URI from the environment / .env. Run it against production by setting
 * MONGO_URI in your shell for that one command. Never prints the connection string.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Quiz = require("../models/quiz.model");
const QuizAttempt = require("../models/quizAttempt.model");

const shouldDelete = process.argv.includes("--delete");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/learning_marketplace");

    const filter = {
      isAIGenerated: true,
      "questions.questionText": { $regex: "^\\[Sample\\]|GEMINI_API_KEY|GROQ_API_KEY", $options: "i" },
    };
    const bad = await Quiz.find(filter).select("_id title createdAt");

    if (bad.length === 0) {
      console.log("No sample/placeholder quizzes found. Nothing to do.");
      return;
    }

    console.log(`Found ${bad.length} placeholder quiz(zes):`);
    bad.forEach((q) => console.log(`  - ${q._id}  "${q.title}"  (${q.createdAt?.toISOString?.() || "n/a"})`));

    if (!shouldDelete) {
      console.log("\nDRY RUN - nothing deleted. Re-run with `-- --delete` to remove them.");
      return;
    }

    const ids = bad.map((q) => q._id);
    const attempts = await QuizAttempt.deleteMany({ quiz: { $in: ids } });
    const quizzes = await Quiz.deleteMany({ _id: { $in: ids } });
    console.log(`\nDeleted ${quizzes.deletedCount} quiz(zes) and ${attempts.deletedCount} related attempt(s).`);
  } catch (err) {
    console.error("Cleanup failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
