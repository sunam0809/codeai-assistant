import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, messagesTable, generatedFilesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import { chat } from "../lib/grok.js";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// GET /api/projects/:id/messages
router.get("/", async (req: AuthRequest, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  try {
    // Verify ownership
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.projectId, projectId))
      .orderBy(asc(messagesTable.createdAt));

    // Attach files to each message
    const messagesWithFiles = await Promise.all(
      messages.map(async (m) => {
        const files = await db
          .select()
          .from(generatedFilesTable)
          .where(eq(generatedFilesTable.messageId, m.id));
        return {
          ...m,
          files: files.map((f) => ({
            id: f.id,
            messageId: f.messageId,
            filename: f.filename,
            fileType: f.fileType,
            sizeBytes: f.sizeBytes,
            createdAt: f.createdAt,
          })),
        };
      })
    );

    res.json(messagesWithFiles);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects/:id/messages
router.post("/", async (req: AuthRequest, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }
  try {
    // Verify ownership
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.userId!)))
      .limit(1);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    // Save user message
    const [userMsg] = await db
      .insert(messagesTable)
      .values({ projectId, role: "user", content: content.trim() })
      .returning();

    // Get conversation history for context
    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.projectId, projectId))
      .orderBy(asc(messagesTable.createdAt));

    const chatHistory = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call Grok AI
    const grokResponse = await chat(chatHistory);

    // Save assistant message
    const [assistantMsg] = await db
      .insert(messagesTable)
      .values({ projectId, role: "assistant", content: grokResponse.content })
      .returning();

    // Save generated files
    const savedFiles = [];
    for (const fileInfo of grokResponse.files) {
      const [savedFile] = await db
        .insert(generatedFilesTable)
        .values({
          messageId: assistantMsg.id,
          filename: fileInfo.filename,
          fileType: fileInfo.fileType,
          content: fileInfo.content, // base64
          sizeBytes: fileInfo.sizeBytes,
        })
        .returning();
      savedFiles.push({
        id: savedFile.id,
        messageId: savedFile.messageId,
        filename: savedFile.filename,
        fileType: savedFile.fileType,
        sizeBytes: savedFile.sizeBytes,
        createdAt: savedFile.createdAt,
      });
    }

    // Update project updatedAt
    await db
      .update(projectsTable)
      .set({ updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    res.json({
      id: assistantMsg.id,
      projectId: assistantMsg.projectId,
      role: assistantMsg.role,
      content: assistantMsg.content,
      files: savedFiles,
      createdAt: assistantMsg.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
