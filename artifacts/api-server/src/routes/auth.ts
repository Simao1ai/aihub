import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/verify", (req, res) => {
  const password = req.query.password as string;
  const appPassword = process.env.APP_PASSWORD || "aihub2024";
  if (password === appPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid password" });
  }
});

export default router;
