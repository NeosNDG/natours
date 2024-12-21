const mongoose = require('mongoose');
const {
  logExecutionTime,
  LoggerVerbosity,
} = require('mongoose-execution-time');

const Tour = require('./tourModel');

mongoose.plugin(logExecutionTime, {
  loggerVerbosity: LoggerVerbosity.Normal,
});

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'You need to provide a review for your review ;)'],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      // required: [true, 'You need to rate the tour you are reviewing.'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // is not working due to "cannot index parallel arrays [user] [tour]" error
reviewSchema.pre('save', async function (next) {
  const existingReview = await this.constructor.findOne({
    tour: this.tour,
    user: this.user,
  });

  if (existingReview) {
    // If a review already exists for the same tour and user combination, prevent saving the new review
    const error = new Error('Duplicate review');
    error.statusCode = 400;
    return next(error);
  }

  return next();
});

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate -> is a short hand for findOneAndUpdate({...})
// findByIdAndDelete -> is a short hand for findOneAndDelete({...})
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // const r or this.r = await this.findOne(); -> that´s how the course did it but it´s not working anymore with current mongoose. So, we need to use this here:
  this.reviewDoc = await this.clone().findOne();
  // console.log(this.reviewDoc);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.clone().findOne(); does not work here as the query has already been executed!
  await this.reviewDoc.constructor.calcAverageRatings(this.reviewDoc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
