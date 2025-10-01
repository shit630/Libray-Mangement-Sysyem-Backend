const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleBaseAccessMiddleware = require("../middleware/roleBaseAccess.middleware");
const {
  createBook,
  getBooks,
  getBook,
  updateBook,
  deleteBook,
  addReview,
} = require("../controllers/book.controller");
const { upload } = require("../configs/cloudinary");
const optionalAuth = require("../middleware/optionalAuth");

const BookRouter = express.Router();

BookRouter.post(
  "/",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  upload.single("image"),
  createBook
);
BookRouter.get("/", optionalAuth, getBooks);
BookRouter.get("/:id", optionalAuth, getBook);
BookRouter.put(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  upload.single("image"),
  updateBook
);
BookRouter.delete(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  deleteBook
);
BookRouter.post("/:id/reviews", authMiddleware, addReview);

module.exports = BookRouter;
