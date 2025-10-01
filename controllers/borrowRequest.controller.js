const BookModel = require("../models/book.model");
const BorrowRequestModel = require("../models/borrowRequest.model");
const UserModel = require("../models/user.model");
const { sendEmail, emailTemplates } = require("../utils/sendEmail");

// @desc    Create borrow request
// @route   POST /api/borrow-requests/:bookId
// @access  Private
const createBorrowRequest = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { expectedReturnDate } = req.body;
    const book = await BookModel.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    // Check if book is available
    if (book.availableCopies < 1) {
      return res.status(400).json({
        success: false,
        message: "Book is not available for borrowing",
      });
    }

    // Check if user already has a pending or approved request for this book
    const existingRequest = await BorrowRequestModel.findOne({
      user: req.user.id,
      book: bookId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already have an active request for this book",
      });
    }

    // Calculate total amount with tax (10%)
    const tax = book.price * 0.1;
    const totalAmount = book.price + tax;

    await BorrowRequestModel.create({
      user: req.user.id,
      book: bookId,
      expectedReturnDate,
      totalAmount,
    });

    // Add to user's borrowed books
    await UserModel.findByIdAndUpdate(req.user.id, {
      $push: {
        borrowedBooks: {
          book: bookId,
          returnDate: expectedReturnDate,
          status: "pending",
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Borrow request sent to admin`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all borrow requests
// @route   GET /api/borrow-requests
// @access  Private/Admin
const getBorrowRequests = async (req, res, next) => {
  try {
    let { search = "", status, page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    // Search regex
    const searchRegex = new RegExp(search.trim(), "i");

    let borrowRequests = await BorrowRequestModel.find()
      .populate("user", "fullName email profilePicture")
      .populate("book", "title author image")
      .sort({ createdAt: -1 });

    // Apply search (user fullName, book title, or status)
    if (search) {
      borrowRequests = borrowRequests.filter(
        (bReq) =>
          searchRegex.test(bReq.user?.fullName) ||
          searchRegex.test(bReq.book?.title)
      );
    }

    // Apply status filter if provided
    if (status) {
      borrowRequests = borrowRequests.filter((bReq) => bReq.status === status);
    }

    // Pagination
    const totalBorrowReq = borrowRequests.length;
    const totalPages = Math.ceil(totalBorrowReq / limit);
    const paginatedData = borrowRequests.slice(
      (page - 1) * limit,
      page * limit
    );

    res.status(200).json({
      success: true,
      totalBorrowReq,
      totalPages,
      currentPage: page,
      data: paginatedData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get user's borrow requests
// @route   GET /api/borrow-requests/my-requests
// @access  Private
const getMyBorrowRequests = async (req, res, next) => {
  try {
    const borrowRequests = await BorrowRequestModel.find({ user: req.user.id })
      .populate("book", "title author image")
      .sort({ createdAt: -1 });

    if (!borrowRequests) {
      return res.status(404).json({
        success: false,
        message: "No borrow request book found",
      });
    }

    res.status(200).json({
      success: true,
      count: borrowRequests.length,
      data: borrowRequests,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update borrow request status
// @route   PUT /api/borrow-requests/:id/
// @access  Private/Admin
const updateBorrowRequest = async (req, res, next) => {
  try {
    const { status = "approved" } = req.body;

    let borrowRequest = await BorrowRequestModel.findById(req.params.id)
      .populate("book")
      .populate("user");

    if (!borrowRequest) {
      return res.status(404).json({
        success: false,
        message: "Borrow request not found",
      });
    }

    // If approving a request, update book availability
    if (status === "approved" && borrowRequest.status === "pending") {
      const book = await BookModel.findById(borrowRequest.book._id);

      if (book.availableCopies < 1) {
        return res.status(400).json({
          success: false,
          message: "No available copies of this book",
        });
      }
      book.availableCopies -= 1;
      book.borrowedCount += 1;
      await book.save();

      // Update user's borrowed books status
      await UserModel.updateOne(
        {
          _id: borrowRequest.user._id,
          "borrowedBooks.book": borrowRequest.book._id,
        },

        {
          $set: {
            "borrowedBooks.$.status": "approved",
          },
        }
      );

      //send approval email
      sendEmail({
        email: borrowRequest.user.email,
        subject: "Borrow Request Approved - LibraryHub",
        html: emailTemplates.borrowApproved(
          borrowRequest.user,
          borrowRequest.book
        ),
      }).catch(console.error);
    }

    if (status === "rejected" && borrowRequest.status === "approved") {
      return res.status(404).json({
        success: false,
        message: "Approved status cann't be rejected",
      });
    }

    // If rejecting a pending request
    if (status === "rejected" && borrowRequest.status === "pending") {
      // Update user's borrowed books status
      await UserModel.updateOne(
        {
          _id: borrowRequest.user._id,
          "borrowedBooks.book": borrowRequest.book._id,
        },
        {
          $set: { "borrowedBooks.$.status": "rejected" },
        }
      );

      //send reject email
      sendEmail({
        email: borrowRequest.user.email,
        subject: "Borrow Request Rejected - LibraryHub",
        html: emailTemplates.borrowRejected(
          borrowRequest.user,
          borrowRequest.book,
          "Something went wrong, please try again later"
        ),
      }).catch(console.error);
    }
    borrowRequest.status = status;
    await borrowRequest.save();

    res.status(200).json({
      success: true,
      message: `Borrow request ${status}`,
      data: borrowRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel borrow request
// @route   PUT /api/borrow-requests/:id/cancel
// @access  Private
const cancelBorrowRequest = async (req, res, next) => {
  try {
    let borrowRequest = await BorrowRequestModel.findById(req.params.id);

    if (!borrowRequest) {
      return res.status(404).json({
        success: false,
        message: "Borrow request not found",
      });
    }

    // Check if user owns the request
    if (borrowRequest.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this request",
      });
    }

    if (borrowRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    borrowRequest.status = "cancelled";
    await borrowRequest.save();

    // Update user's borrowed books status
    await UserModel.updateOne(
      {
        _id: req.user.id,
        "borrowedBooks.book": borrowRequest.book._id,
      },
      {
        $set: {
          "borrowedBooks.$.status": "cancelled",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Borrow request cancelled successfully",
      data: borrowRequest,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Return borrowed book
// @route   PUT /api/borrow-requests/:id/return
// @access  Private
const returnBorrowBook = async (req, res, next) => {
  try {
    const borrowRequest = await BorrowRequestModel.findById(req.params.id);

    if (!borrowRequest) {
      return res.status(404).json({
        success: false,
        message: "Borrow request not found",
      });
    }

    if (borrowRequest.status !== "approved") {
      return res.status(404).json({
        success: false,
        message: "Only approved books can be returned",
      });
    }

    // returning a book
    if (borrowRequest.status === "approved") {
      const book = await BookModel.findById(borrowRequest.book);
      book.availableCopies += 1;
      await book.save();

      let actualReturnDate = new Date();
      borrowRequest.actualReturnDate = actualReturnDate;

      if (actualReturnDate > borrowRequest.expectedReturnDate) {
        let daysLate = Math.ceil(
          (actualReturnDate - borrowRequest.expectedReturnDate) /
            (1000 * 60 * 60 * 24)
        );

        let calculateFine = daysLate * 10;
        borrowRequest.fineAmount = calculateFine;
      }

      // Update user's borrowed books status
      await UserModel.updateOne(
        {
          _id: borrowRequest.user._id,
          "borrowedBooks.book": borrowRequest.book._id,
        },
        {
          $set: {
            "borrowedBooks.$.status": "returned",
          },
        }
      );

      borrowRequest.status = "returned";
      await borrowRequest.save();
    }

    res.status(200).json({
      success: true,
      data: borrowRequest,
      message: "Thank you for return the book",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBorrowRequest,
  getBorrowRequests,
  getMyBorrowRequests,
  updateBorrowRequest,
  cancelBorrowRequest,
  returnBorrowBook,
};
