import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "KairoPro <noreply@kairopro.in>",
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>?/gm, ""),
    });
    logger.info(`Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}
