import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up the user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user exists, create a token and send email
    // If not, we silently return success to prevent email enumeration attacks.
    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      // Delete any existing tokens for this email to prevent spam
      await db.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      });

      // Save token to DB
      await db.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires,
        },
      });

      // Construct reset URL (assuming frontend runs on the host specified in headers, or default localhost)
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

      // Send email
      await sendEmail({
        to: user.email,
        subject: "Reset your KairoPro password",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for your KairoPro account.</p>
            <p>Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">
              Reset Password
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      
      logger.info(`Password reset email sent to ${normalizedEmail}`);
    } else {
      logger.warn(`Password reset requested for non-existent email: ${normalizedEmail}`);
    }

    return NextResponse.json({ success: true, message: "If your email is registered, a reset link was sent." });
  } catch (error) {
    logger.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
