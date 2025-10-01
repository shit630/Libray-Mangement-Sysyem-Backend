const { uploadImage, deleteImage } = require("../configs/cloudinary");
const BookModel = require("../models/book.model");
const UserModel = require("../models/user.model");

// @desc    Create new book
// @route   POST /api/books
// @access  Private/Admin
const createBook = async (req, res) => {
  try {
    let image = null;

    if (req.file) {
      try {
        const result = await uploadImage(
          req.file.path,
          "library-management/books"
        );
        image = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Error uploading book cover image",
        });
      }
    }

    const book = await BookModel.create({ ...req.body, image });

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (error) {
    // ⭐ safer delete
    if (req.file && req.file.public_id) {
      await deleteImage(req.file.public_id).catch(console.error);
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all books
// @route   GET /api/books
// @access  Public (favorites only if logged in)
const getBooks = async (req, res) => {
  try {
    let { search, category, minRating, sort, page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);
    minRating = Number(minRating);

    let query = {};

    // 🔎 Search
    if (search && search.trim()) {
      const searchRegex = search.trim().replace(/\s+/g, ".*");
      query.$or = [
        { title: { $regex: searchRegex, $options: "i" } },
        { author: { $regex: searchRegex, $options: "i" } },
      ];
    }

    // 📚 Category
    if (category) query.category = category;

    // ⭐ Rating filter
    if (minRating > 0) query.ratings = { $gte: minRating };

    let bookQuery = BookModel.find(query);

    // ↕️ Sorting
    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating_asc: { ratings: 1 },
      rating_desc: { ratings: -1 },
    };
    bookQuery = bookQuery.sort(sortOptions[sort] || { createdAt: -1 });

    // 📄 Pagination
    const totalBooks = await BookModel.countDocuments(query);
    const totalPages = Math.ceil(totalBooks / limit);
    const skip = (page - 1) * limit;

    let books = await bookQuery.skip(skip).limit(limit);

    // ⭐ Attach isFavorite correctly
    if (req.user) {
      const user = await UserModel.findById(req.user.id).select(
        "favoriteBooks"
      );
      const favoriteSet = new Set(
        user.favoriteBooks.map((id) => id.toString())
      );

      books = books.map((book) => ({
        ...book.toObject(),
        isFavorite: favoriteSet.has(book._id.toString()),
      }));
    } else {
      books = books.map((book) => ({
        ...book.toObject(),
        isFavorite: false,
      }));
    }

    res.status(200).json({
      success: true,
      totalPages,
      totalBooks,
      page,
      limit,
      data: books,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public (favorites only if logged in)
const getBook = async (req, res) => {
  try {
    const book = await BookModel.findById(req.params.id).populate(
      "reviews.user",
      "fullName profilePicture"
    );

    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    let isFavorite = false;

    // ⭐ Add favorite check
    if (req.user) {
      const user = await UserModel.findById(req.user.id).select(
        "favoriteBooks"
      );
      isFavorite = user.favoriteBooks
        .map((id) => id.toString())
        .includes(book._id.toString());
    }

    res.status(200).json({
      success: true,
      data: { ...book.toObject(), isFavorite },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = async (req, res) => {
  try {
    let book = await BookModel.findById(req.params.id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    const updateData = { ...req.body };

    if (req.file) {
      try {
        if (book.image?.public_id) {
          await deleteImage(book.image.public_id);
        }

        const result = await uploadImage(
          req.file.path,
          "library-management/books"
        );

        updateData.image = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (error) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Error uploading book cover image",
          });
      }
    }

    book = await BookModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: book });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = async (req, res) => {
  try {
    const book = await BookModel.findById(req.params.id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    if (book.image?.public_id) {
      await deleteImage(book.image.public_id);
    }

    await book.deleteOne();
    res.status(200).json({ success: true, message: "Book Delete Success" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Add review for a book
// @route   POST /api/books/:id/reviews
// @access  Private
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const book = await BookModel.findById(req.params.id);

    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    // Prevent multiple reviews from same user
    const alreadyReviewed = book.reviews.find(
      (review) => review.user.toString() === req.user.id.toString()
    );
    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ success: false, message: "Book already reviewed" });
    }

    book.reviews.push({ user: req.user.id, rating: Number(rating), comment });

    book.ratings =
      book.reviews.reduce((acc, r) => acc + r.rating, 0) / book.reviews.length;

    await book.save();

    res
      .status(200)
      .json({ success: true, message: "Review added successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBook,
  updateBook,
  deleteBook,
  addReview,
};
