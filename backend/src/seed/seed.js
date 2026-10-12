require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/user.model");
const Course = require("../models/course.model");
const Resource = require("../models/resource.model");
const Community = require("../models/community.model");
const Post = require("../models/post.model");
const Quiz = require("../models/quiz.model");

const { ROLES, COURSE_STATUS, COURSE_LEVEL, RESOURCE_TYPE } = require("../constants");

const seed = async () => {
  await connectDB();

  console.log("🧹 Clearing existing demo data...");
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Resource.deleteMany({}),
    Community.deleteMany({}),
    Post.deleteMany({}),
    Quiz.deleteMany({}),
  ]);

  console.log("👤 Creating users...");
  const admin = await User.create({
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: ROLES.ADMIN,
  });

  const teacher = await User.create({
    name: "Priya Sharma",
    email: "teacher@example.com",
    password: "password123",
    role: ROLES.TEACHER,
    bio: "Physics educator with 8 years of JEE/NEET coaching experience.",
    expertise: ["Physics", "Mathematics"],
    isVerifiedTeacher: true,
  });

  const student = await User.create({
    name: "Rahul Verma",
    email: "student@example.com",
    password: "password123",
    role: ROLES.STUDENT,
    stream: "Engineering",
    examTarget: "JEE Main",
    interests: ["Physics", "Problem Solving"],
  });

  console.log("📚 Creating a course...");
  const course = await Course.create({
    title: "JEE Physics Mastery - Mechanics to Modern Physics",
    description:
      "A complete, exam-focused Physics course covering Mechanics, Thermodynamics, Electromagnetism, and Modern Physics with 500+ practice problems.",
    teacher: teacher._id,
    stream: "Engineering",
    subject: "Physics",
    examTags: ["JEE Main", "JEE Advanced"],
    price: 499,
    discountPrice: 299,
    level: COURSE_LEVEL.INTERMEDIATE,
    status: COURSE_STATUS.PUBLISHED,
    modules: [
      { title: "Mechanics Fundamentals", description: "Kinematics, Laws of Motion, Work-Energy", order: 1 },
      { title: "Thermodynamics", description: "Heat, Temperature, Laws of Thermodynamics", order: 2 },
      { title: "Electromagnetism", description: "Electrostatics, Current, Magnetism", order: 3 },
      { title: "Modern Physics", description: "Atomic structure, Nuclear Physics, Quantum basics", order: 4 },
    ],
    tags: ["physics", "jee", "mechanics"],
    duration: "10 weeks",
  });

  console.log("📄 Creating a resource...");
  await Resource.create({
    title: "Mechanics Formula Sheet (Quick Revision)",
    description: "A condensed one-page formula sheet for all of Mechanics.",
    type: RESOURCE_TYPE.NOTE,
    uploadedBy: teacher._id,
    course: course._id,
    stream: "Engineering",
    subject: "Physics",
    examTags: ["JEE Main"],
    tags: ["formula-sheet", "mechanics"],
  });

  console.log("👥 Creating a community...");
  const community = await Community.create({
    name: "JEE Physics Aspirants",
    description: "A community for JEE aspirants to discuss Physics doubts and share resources.",
    subject: "Physics",
    examTags: ["JEE Main", "JEE Advanced"],
    createdBy: teacher._id,
    members: [teacher._id, student._id],
    moderators: [teacher._id],
    memberCount: 2,
  });

  console.log("💬 Creating a doubt post...");
  await Post.create({
    community: community._id,
    author: student._id,
    title: "Doubt: Why does normal force change on an incline?",
    content: "I'm confused about how normal force is affected when a block is on an inclined plane with friction. Can someone explain?",
    isDoubt: true,
    tags: ["mechanics", "friction"],
  });

  console.log("📝 Creating a quiz...");
  await Quiz.create({
    title: "Mechanics Quick Practice Quiz",
    createdBy: teacher._id,
    course: course._id,
    subject: "Physics",
    topic: "Mechanics",
    examTags: ["JEE Main"],
    difficulty: "medium",
    questions: [
      {
        questionText: "What is the SI unit of Force?",
        options: ["Joule", "Newton", "Watt", "Pascal"],
        correctOptionIndex: 1,
        explanation: "Force is measured in Newtons (N) as per the SI system.",
      },
      {
        questionText: "Which law states 'For every action there is an equal and opposite reaction'?",
        options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation"],
        correctOptionIndex: 2,
        explanation: "This is Newton's Third Law of Motion.",
      },
    ],
  });

  console.log("\n✅ Seed data created successfully!\n");
  console.log("Demo accounts (password for all: password123):");
  console.log(`  Admin:   ${admin.email}`);
  console.log(`  Teacher: ${teacher.email}`);
  console.log(`  Student: ${student.email}`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
