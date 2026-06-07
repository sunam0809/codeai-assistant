import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) return false;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `CodeAI <${from}>`,
      to: email,
      subject: "CodeAI 이메일 인증 코드",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
          <h2 style="color:#06b6d4;margin-bottom:8px;">CodeAI 인증 코드</h2>
          <p style="color:#94a3b8;margin-bottom:24px;">아래 6자리 코드를 입력하세요. 10분 내에 만료됩니다.</p>
          <div style="background:#1e293b;border:2px solid #06b6d4;border-radius:12px;padding:24px;text-align:center;">
            <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#06b6d4;">${code}</span>
          </div>
          <p style="color:#64748b;margin-top:24px;font-size:12px;">이 이메일을 요청하지 않으셨다면 무시하세요.</p>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || !email.includes("@") || password.length < 6) {
    res.status(400).json({ error: "유효한 이메일과 6자 이상 비밀번호가 필요합니다" });
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      verificationCode: code,
      verificationExpires: expires,
      verified: false,
    }).returning();

    const emailSent = await sendVerificationEmail(email.toLowerCase(), code);

    res.status(201).json({
      message: "인증 코드가 발송되었습니다",
      email: user.email,
      requiresVerification: true,
      ...(emailSent ? {} : { devCode: code }),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "이메일과 인증 코드가 필요합니다" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      return;
    }
    if (user.verified) {
      const token = signToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
      return;
    }
    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      res.status(400).json({ error: "잘못된 인증 코드입니다" });
      return;
    }
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      res.status(400).json({ error: "인증 코드가 만료되었습니다. 다시 가입해주세요." });
      return;
    }

    await db.update(usersTable)
      .set({ verified: true, verificationCode: null, verificationExpires: null })
      .where(eq(usersTable.id, user.id));

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// POST /api/auth/resend
router.post("/resend", async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "이메일이 필요합니다" }); return; }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || user.verified) {
      res.status(400).json({ error: "재발송할 수 없습니다" });
      return;
    }
    const code = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await db.update(usersTable).set({ verificationCode: code, verificationExpires: expires }).where(eq(usersTable.id, user.id));
    const emailSent = await sendVerificationEmail(email.toLowerCase(), code);
    res.json({ message: "재발송 완료", ...(emailSent ? {} : { devCode: code }) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 틀렸습니다" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 틀렸습니다" });
      return;
    }
    if (!user.verified) {
      res.status(403).json({ error: "이메일 인증이 필요합니다", requiresVerification: true, email: user.email });
      return;
    }
    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
      return;
    }
    res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
});

// POST /api/auth/logout
router.post("/logout", authMiddleware, (_req, res) => {
  res.json({ message: "로그아웃 되었습니다" });
});

export default router;
