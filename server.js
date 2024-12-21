const mongoose = require('mongoose');
const dotenv = require('dotenv');

// listening to uncaughtException e.g. ReferenceError (undefined variables)
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXEPTION! Shutting down gracefully...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection succesful!'));
// adding .catch(() => console.log('ERROR')); to handle DB connect errors would also work.
// wasn´t done in the course because it was about how to globally handle unhandled rejected promises

const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`App running on port ${port}...`);
});

// listening to unhandledRejection to globally handle unhandled rejected promises
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down gracefully...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
