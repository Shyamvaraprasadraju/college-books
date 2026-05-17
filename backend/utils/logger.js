import { db } from "../db.js";

export const logAction = async (userEmail, action, details) => {
  try {
    await db.query(
      "INSERT INTO audit_logs (user_email, action, details) VALUES (?, ?, ?)",
      [userEmail, action, details]
    );
  } catch (err) {
    console.error("Error logging action:", err);
  }
};
