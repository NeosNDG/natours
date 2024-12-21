const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking mus belong to a tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking mus belong to a tour!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.pre(/^find/, function (next) {
  // making sure that population is only triggered for the frontend, not for API calls. see bookingController for usage
  if (this.getOptions().dontPop) return next();

  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

// bookingSchema.post(/^find/, function (docs, next) {
//   // Ensure docs is always an array for consistent processing
//   const documents = Array.isArray(docs) ? docs : [docs];

//   documents.forEach((doc) => {
//     if (doc.tour && typeof doc.tour === 'object') {
//       // Replace the populated field with only the desired data
//       doc.tour = { name: doc.tour.name };
//     }
//   });

//   next();
// });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
