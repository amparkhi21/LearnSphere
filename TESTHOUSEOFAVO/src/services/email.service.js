const nodemailer = require("nodemailer");

const isEmailConfigured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter = null;
if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`[email.service] Skipped sending (no EMAIL_USER/EMAIL_PASS configured). To: ${to}, Subject: ${subject}`);
    return { skipped: true };
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: "Welcome to the Learning Marketplace 🎓",
    html: `<h2>Hi ${user.name},</h2><p>Welcome aboard! Start exploring courses, join communities, and generate your first AI study plan.</p>`,
  });

const sendEnrollmentEmail = (user, course) =>
  sendEmail({
    to: user.email,
    subject: `You're enrolled in ${course.title}!`,
    html: `<h2>Hi ${user.name},</h2><p>You've successfully enrolled in <strong>${course.title}</strong>. Happy learning!</p>`,
  });

module.exports = { sendEmail, sendWelcomeEmail, sendEnrollmentEmail, isEmailConfigured };
