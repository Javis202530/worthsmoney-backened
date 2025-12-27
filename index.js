const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load users
let users = fs.existsSync("users.json")
  ? JSON.parse(fs.readFileSync("users.json"))
  : [];

// EMAIL CONFIG
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// REGISTER
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (users.find(u => u.email === email))
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");

  const user = {
    email,
    password: hashedPassword,
    verified: false,
    token
  };

  users.push(user);
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  const verifyLink = `http://localhost:3000/verify/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your account",
    html: `<h3>Verify Email</h3><a href="${verifyLink}">Click to verify</a>`
  });

  res.json({ message: "Verification email sent" });
});

// VERIFY EMAIL
app.get("/verify/:token", (req, res) => {
  const user = users.find(u => u.token === req.params.token);
  if (!user) return res.send("Invalid or expired link");

  user.verified = true;
  user.token = null;

  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
  res.send("Email verified successfully!");
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(400).json({ message: "User not found" });
  if (!user.verified) return res.status(403).json({ message: "Verify email first" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Wrong password" });

  res.json({ message: "Login successful" });
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server running successfully 🚀");
});
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Email",
      html: "<h2>Email system is working!</h2>"
    });

    res.send("✅ Email sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Email failed");
  }
});

module.exports = app;


