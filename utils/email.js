const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// example how we want to use the Email class:
// new Email(user, url).sendWelcome();
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Natours <${process.env.NODE_ENV === 'production' ? process.env.RESEND_FROM : process.env.EMAIL_FROM}>`;
  }

  createNatoursMailTransport() {
    if (process.env.NODE_ENV === 'production') {
      // will later become something like resend.com but for now we just
      return nodemailer.createTransport({
        host: process.env.RESEND_HOST,
        secure: true,
        port: process.env.RESEND_PORT,
        auth: {
          user: process.env.RESEND_USERNAME,
          pass: process.env.RESEND_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/email/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );

    // 2) define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.htmlToText(html),
    };

    // 3) create a transport and send email
    await this.createNatoursMailTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Netours Family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 minutes only)',
    );
  }
};
