const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const {
  createBorrowRequest,
  getBorrowRequests,
  getMyBorrowRequests,
  updateBorrowRequest,
  cancelBorrowRequest,
  returnBorrowBook,
} = require("../controllers/borrowRequest.controller");
const roleBaseAccessMiddleware = require("../middleware/roleBaseAccess.middleware");

const BorrowRequestRouter = express.Router();

BorrowRequestRouter.post("/:bookId", authMiddleware, createBorrowRequest);

BorrowRequestRouter.get(
  "/",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  getBorrowRequests
);

BorrowRequestRouter.get("/my-requests", authMiddleware, getMyBorrowRequests);

BorrowRequestRouter.put(
  "/:id",
  authMiddleware,
  roleBaseAccessMiddleware("admin"),
  updateBorrowRequest
);

BorrowRequestRouter.put("/:id/cancel", authMiddleware, cancelBorrowRequest);

BorrowRequestRouter.put("/:id/return", authMiddleware, returnBorrowBook);

module.exports = BorrowRequestRouter;
