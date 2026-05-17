import { Router } from "express";
import { db } from "./db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { logAction } from "./utils/logger.js";
import { verifyToken } from "./middleware/verifyToken.js";

const router = Router();


/**
 * POST /login (mounted as /login in index.js)
 * Admin login with email and password
 * Returns JWT token with user role and department
 */
router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`[LOGIN ATTEMPT] Email: ${email}`);

    // Validate input
    if (!email || !password) {
      console.log('[LOGIN FAILED] Missing email or password');
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Query admin from database
    const [admins] = await db.query(
      "SELECT id, email, password_hash, role, department FROM admins WHERE email = ?",
      [normalizedEmail]
    );

    // Check if admin exists
    if (admins.length === 0) {
      console.log(`[LOGIN FAILED] User not found: ${normalizedEmail}`);
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const admin = admins[0];
    console.log(`[LOGIN] User found: ${admin.email}, Role: ${admin.role}`);

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log(`[LOGIN] Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`[LOGIN FAILED] Invalid password for ${admin.email}`);
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Generate JWT token with full user context
    const token = jwt.sign(
      {
        userEmail: admin.email,
        role: admin.role,
        department: admin.department,
        adminId: admin.id
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Log successful login
    await logAction(admin.email, "LOGIN", `Successful login as ${admin.role}`);

    // Set HTTP-Only Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return token and user data for immediate state loading (no token returned since it's in the cookie)
    return res.status(200).json({
      user: {
        email: admin.email,
        role: admin.role,
        department: admin.department,
        adminId: admin.id
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "An error occurred during login"
    });
  }
});

/**
 * GET /login/status
 * Check if the user's cookie is valid and return their user data
 */
router.get("/status", verifyToken, async (req, res) => {
  return res.status(200).json({ user: req.user });
});

/**
 * POST /login/logout
 * Clear the authentication cookie
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
  });
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
