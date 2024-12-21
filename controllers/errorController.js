const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleCuplicateFields = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const message = `Duplicate field value: ${value[0]}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please login again.', 401);

const handleJWTExpiredError = () =>
  new AppError('You token has expired. Please login again', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // RENDERED WEBSITE
  console.error('ERROR!', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to cliebt
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or unknown error: don´t leak error details

    // 1) log error
    console.error('ERROR!', err);
    // 2) Send generic message to client
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  // B) RENDERED WEBSITE
  // Operational, trusted error: send message to cliebt
  if (err.isOperational) {
    console.error('ERROR!', err);
    return res.status(err.statusCode).render('error', {
      status: 'Something went wrong!',
      msg: err.message,
    });
  }
  // Programming or unknown error: don´t leak error details

  // 1) log error
  console.error('ERROR!', err);
  // 2) Send generic message to client
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    /*
    the original doesn´t work because of some hick hack with the Object:
    let error = { ...err };
    looks like the issue is that in later versions of mongoose the name property of CastError is not an enumerable and using { ...err } to destructure will do a shallow copy and will copy only enumerable properties and since the name is no more an enumerable property it doesn't get copied.

    I was anyway wondering from the start why not using the original Object
    from the get go, at least for the name === 'CastError' comparison. But one obviously shouldn´t mutate 
    the err property from express "because of how JS works"

    some dude said this is the cleanest:
    let error = {...err, name: err.name}; 

    Passing the error Object into the handle functions still doesn´t work for handleCuplicateFields
    I feel like, this is even cleaner:
    */
    let error = JSON.parse(JSON.stringify(err));
    error.message = err.message;
    console.log(error.message);
    if (error.name === 'CastError') error = handleCastErrorDB(err);
    if (error.code === 11000) error = handleCuplicateFields(err);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(err);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
