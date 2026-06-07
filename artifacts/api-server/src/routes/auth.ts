import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();

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
    const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), passwordHash }).returning();
    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
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
    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
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
