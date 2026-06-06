import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import messagesRouter from "./messages";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/projects", projectsRouter);
router.use("/projects/:id/messages", messagesRouter);
router.use("/", filesRouter);

export default router;
