const mongoose = require("mongoose");
const validator = require("validator");
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a book title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    author: {
      type: String,
      required: [true, "Please provide an author name"],
      trim: true,
      maxlength: [50, "Author name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a book description"],
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Please provide a book category"],
      enum: [
        "Fiction",
        "Non-Fiction",
        "Science Fiction",
        "Mystery",
        "Fantasy",
        "Biography",
        "History",
        "Self-Help",
        "Science",
        "Technology",
        "Romance",
        "Thriller",
        "Children",
        "Other",
      ],
    },
    publicationYear: {
      type: Number,
      required: [true, "Please provide publication year"],
      min: [1000, "Publication year seems invalid"],
      max: [
        new Date().getFullYear(),
        "Publication year cannot be in the future",
      ],
    },
    isbn: {
      type: String,
      required: [true, "Please provide an ISBN"],
      unique: true,
      validate: {
        validator: function (isbn) {
          return /^(?:\d{10}|\d{13})$/.test(isbn);
        },
        message: "Please provide a valid ISBN (10 or 13 digits)",
      },
    },
    price: {
      type: Number,
      required: [true, "Please provide a borrowing price"],
      min: [0, "Price cannot be negative"],
    },
    image: {
      public_id: String,
      url: String,
    },
    totalCopies: {
      type: Number,
      required: [true, "Please specify total copies"],
      min: [1, "There must be at least one copy"],
    },
    availableCopies: {
      type: Number,
      min: 0,
    },
    ratings: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    borrowedCount: {
      type: Number,
      default: 0,
    },
    favoritedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate available copies before saving
bookSchema.pre("save", function (next) {
  if (this.isNew) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

const BookModel = mongoose.model("Book", bookSchema);
module.exports = BookModel;
