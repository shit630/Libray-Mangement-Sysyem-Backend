const express = require("express");
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  forgotPassword,
  resetPassword,
  updatePassword,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { upload } = require("../configs/cloudinary");

const AuthRouter = express.Router();

AuthRouter.post("/register", upload.single("profilePicture"), register);
AuthRouter.post("/login", login);
AuthRouter.get("/logout", logout);
AuthRouter.get("/me", authMiddleware, getMe);
AuthRouter.put(
  "/updatedetails",
  authMiddleware,
  upload.single("profilePicture"),
  updateDetails
);
AuthRouter.put("/updatepassword", authMiddleware, updatePassword);
AuthRouter.post("/forgotpassword", forgotPassword);
AuthRouter.put("/resetpassword/:resettoken", resetPassword);

module.exports = AuthRouter;
