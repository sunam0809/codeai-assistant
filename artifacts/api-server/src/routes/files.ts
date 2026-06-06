import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, messagesTable, generatedFilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// GET /api/projects/:id/files
router.get("/projects/:id/files", async (req: AuthRequest, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const files = await db
      .select({
        id: generatedFilesTable.id,
        messageId: generatedFilesTable.messageId,
        filename: generatedFilesTable.filename,
        fileType: generatedFilesTable.fileType,
        sizeBytes: generatedFilesTable.sizeBytes,
        createdAt: generatedFilesTable.createdAt,
      })
      .from(generatedFilesTable)
      .innerJoin(messagesTable, eq(generatedFilesTable.messageId, messagesTable.id))
      .where(eq(messagesTable.projectId, projectId));

    res.json(files);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/files/:fileId/download
router.get("/files/:fileId/download", async (req: AuthRequest, res) => {
  const fileId = parseInt(req.params.fileId);
  if (isNaN(fileId)) { res.status(400).json({ error: "Invalid file id" }); return; }
  try {
    const [file] = await db
      .select()
      .from(generatedFilesTable)
      .where(eq(generatedFilesTable.id, fileId))
      .limit(1);
    if (!file) { res.status(404).json({ error: "File not found" }); return; }

    // Verify ownership via message → project → user
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, file.messageId))
      .limit(1);
    if (!msg) { res.status(404).json({ error: "Not found" }); return; }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, msg.projectId), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!project) { res.status(403).json({ error: "Forbidden" }); return; }

    const buffer = Buffer.from(file.content, "base64");
    res.setHeader("Content-Type", file.fileType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
