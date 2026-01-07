import express from "express";
import protect from "../middleware/protect.js";
import { follow, getFollowers, getMyInfo, updateMyInfo } from "../controllers/user.controller.js";
const router = express.Router();

router.get("/", protect, getMyInfo)

router.patch("/", protect, updateMyInfo)

router.post("/follow/:followed", protect, follow)

router.get("/followers/", protect, getFollowers)


export default router;


