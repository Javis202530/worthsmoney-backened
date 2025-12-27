const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// SIGNUP
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });

  res.json({ message: "Signup successful" });
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Wrong password" });

  const token = jwt.sign({ email }, "secret123", { expiresIn: "1h" });
  res.json({ token });
});


let users = fs.existsSync("users.json")
  ? JSON.parse(fs.readFileSync("users.json"))
  : [];

// EMAIL CONFIG
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_EMAIL@gmail.com",
    pass: "APP_PASSWORD"
  }
});

// SIGNUP
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (users.find(u => u.email === email))
    return res.status(400).send("Email already exists");

  const token = crypto.randomBytes(32).toString("hex");

  users.push({ email, password, verified: false, token });
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  const link = `http://localhost:3000/verify/${token}`;

  transporter.sendMail({
    to: email,
    subject: "Verify your account",
    html: `<h3>Verify Account</h3><a href="${link}">Click here</a>`
  });

  res.send("Verification email sent");
});

// VERIFY EMAIL
app.get("/verify/:token", (req, res) => {
  const user = users.find(u => u.token === req.params.token);
  if (!user) return res.send("Invalid link");

  user.verified = true;
  user.token = null;
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  res.send("Email verified! You can now login.");
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).send("Invalid credentials");
  if (!user.verified) return res.status(403).send("Verify your email first");

  res.send("Login successful");
});
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Email Successful",
      html: "<h2>Your email system is working!</h2>"
    });

    res.send("✅ Email sent successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Email failed");
  }
});
app.get("/", (req, res) => {
  res.send("Server is running successfully 🚀");
});
app.get("/api/test", (req, res) => {
  res.json({ message: "API working successfully" });
});
// Test API route
app.listen(3000, () => console.log("Server running on http://localhost:3000"));


