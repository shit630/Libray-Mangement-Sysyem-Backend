const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleBaseAccessMiddleware = require("../middleware/roleBaseAccess.middleware");
const {
  getUsers,
  getUser,
  deleteUser,
  addToFavorites,
  removeFromFavorites,
  updateUser,
} = require("../controllers/user.controller");

const UserRouter = express.Router();

UserRouter.get(
  "/",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  getUsers
);

UserRouter.get(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  getUser
);

UserRouter.put(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  updateUser
);

UserRouter.delete(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  deleteUser
);

UserRouter.post("/favorites/:bookId", authMiddleware, addToFavorites);

UserRouter.delete("/favorites/:bookId", authMiddleware, removeFromFavorites);

module.exports = UserRouter;
