const mongoose = require("mongoose");

const borrowRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrowDate: {
      type: Date,
    },
    expectedReturnDate: {
      type: Date,
    },
    actualReturnDate: Date,
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "returned",
        "overdue",
        "cancelled",
      ],
      default: "pending",
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: [0, "Fine amonut conn't goes to negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const BorrowRequestModel = mongoose.model("BorrowRequest", borrowRequestSchema);

module.exports = BorrowRequestModel;
