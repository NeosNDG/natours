const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
//serving static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
// set secruity http headers
app.use(
  helmet({
    contentSecurityPolicy: {
      // useDefault: false,
      directives: {
        'default-src': [
          "'self'",
          'api.mapbox.com',
          'events.mapbox.com',
          'js.stripe.com',
        ],
        'script-src': [
          "'self'",
          'api.mapbox.com blob:',
          'cdn.jsdelivr.net',
          'js.stripe.com',
        ],
        // 'worker-src': ["'self'", 'api.mapbox.com blob:'],
      },
    },
  }),
);

// development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // morgan is a logger
}

// limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// data sanitization against NoSQL query injection
// this will always return all users as greater than always matches!
// "email": {"$gt": ""}
// hence we need to do some data sanittization
app.use(mongoSanitize());

// data sanitization against XSS attacks
app.use(xss());

// prevent parameter polution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// this is our own middleware, doing something
// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👌');
//   next();
// });

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 2) mounting routers

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

// middleware for unhandled routes
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can´t find ${req.originalUrl} on this server`,
  // });

  // const err = new Error(`Can´t find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can´t find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

// 3) export so we can use it in server.js
module.exports = app;

// this is how it works with pure node.js, without express
// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);
