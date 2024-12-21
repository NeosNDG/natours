const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator'); // for validator demo in name

const {
  logExecutionTime,
  LoggerVerbosity,
} = require('mongoose-execution-time');

mongoose.plugin(logExecutionTime, {
  loggerVerbosity: LoggerVerbosity.Normal,
});

const GEOSPATIAL_OPERATOR_TEST = /^[$]geo[a-zA-Z]*/;

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'Name can only be 40 chars'],
      minlength: [10, 'Name muts have at least 10 chars'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], // not working here because e.g whitespaces are no characters
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Available difficulties are: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this keyword only refers to the currenty docuement on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // MongoDB uses GeoJSON to specify geospacial data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// we need to index the geoSpatial field - otherwise, we cannot query it with geoSpatial queries
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  // foreignField = reference to the reviewModel´s tour array
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT mongoose MIDDLEWARE: only runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//
//
//
//
// the following function is how embedding works
// i.e. how we would embed the users into a guides array in the mongodb tours collection
// in the schema, it´s simply: guides: Array,
// in create new tour it would be:
// "guides": [
//   "674e1b8e9825e8b561c343ac", <-- user ID
//   "6748dd07aac15dd12f468bb4"
// ]
// but, if we would do so, we would also have to add the same logic for updating the tours
//
//
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => User.findById(id)); // to get access to the User model, we also need to require the userModel.js
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// QUERY mongoose MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  // this.find({ secretTour: false }); // just { secretTour: false } works as well
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// AGGREGATION mongoose MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  const geoAggregate = this.pipeline().filter(
    // finding if the pipeline stage name has any geo operator using the regex. 'search' method on a string returns -1 if the match is not found else non zero value
    (stage) =>
      Object.keys(stage)[0].search(GEOSPATIAL_OPERATOR_TEST) !== -1,
  );

  //Placing secretTour query first if no GEO queries exist
  if (geoAggregate.length === 0) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }

  //If GEO queries exist, keep the secret tour functionality by placing the secretTour query after all GEO queries in the pipeline
  else {
    this.pipeline().splice(geoAggregate.length, 0, {
      $match: { secretTour: { $ne: true } },
    });
  }
  console.log(this.pipeline());
  next();
});

// original secretTour exclusion form the curse but does not work with the geoNear query
// in tourController.distances as geo spacial queries have to go first
// but this one would always go before the one in the controller.
// Hence, see adopted "pre" middleware above
// tourSchema.pre('aggregate', function () {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
// });

const Tour = mongoose.model('Tour', tourSchema);

// export so we can use it in tourController.js
module.exports = Tour;
