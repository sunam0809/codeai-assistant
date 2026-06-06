import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, messagesTable, generatedFilesTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.use(authMiddleware);

// GET /api/projects/stats
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [projectCount] = await db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId));

    const msgCountResult = await db
      .select({ count: count() })
      .from(messagesTable)
      .innerJoin(projectsTable, eq(messagesTable.projectId, projectsTable.id))
      .where(eq(projectsTable.userId, userId));

    const fileCountResult = await db
      .select({ count: count() })
      .from(generatedFilesTable)
      .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
      .innerJoin(projectsTable, eq(messagesTable.projectId, projectsTable.id))
      .where(eq(projectsTable.userId, userId));

    const recentProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId))
      .orderBy(sql`${projectsTable.updatedAt} DESC`)
      .limit(5);

    // Get message and file counts for recent projects
    const projectsWithCounts = await Promise.all(
      recentProjects.map(async (p) => {
        const [mc] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.projectId, p.id));
        const [fc] = await db
          .select({ count: count() })
          .from(generatedFilesTable)
          .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
          .where(eq(messagesTable.projectId, p.id));
        return { ...p, messageCount: Number(mc.count), fileCount: Number(fc.count) };
      })
    );

    res.json({
      totalProjects: Number(projectCount.count),
      totalMessages: Number(msgCountResult[0]?.count ?? 0),
      totalFiles: Number(fileCountResult[0]?.count ?? 0),
      recentProjects: projectsWithCounts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects
router.get("/", async (req: AuthRequest, res) => {
  try {
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.userId!))
      .orderBy(sql`${projectsTable.updatedAt} DESC`);

    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const [mc] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.projectId, p.id));
        const [fc] = await db
          .select({ count: count() })
          .from(generatedFilesTable)
          .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
          .where(eq(messagesTable.projectId, p.id));
        return { ...p, messageCount: Number(mc.count), fileCount: Number(fc.count) };
      })
    );

    res.json(projectsWithCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects
router.post("/", async (req: AuthRequest, res) => {
  const { name, description } = req.body;
  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  try {
    const [project] = await db
      .insert(projectsTable)
      .values({ userId: req.userId!, name: name.trim(), description: description || null })
      .returning();
    res.status(201).json({ ...project, messageCount: 0, fileCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:id
router.get("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const [mc] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.projectId, id));
    const [fc] = await db
      .select({ count: count() })
      .from(generatedFilesTable)
      .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
      .where(eq(messagesTable.projectId, id));
    res.json({ ...project, messageCount: Number(mc.count), fileCount: Number(fc.count) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description } = req.body;
  try {
    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
    const [mc] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.projectId, id));
    const [fc] = await db
      .select({ count: count() })
      .from(generatedFilesTable)
      .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
      .where(eq(messagesTable.projectId, id));
    res.json({ ...updated, messageCount: Number(mc.count), fileCount: Number(fc.count) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.json({ message: "Project deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
