const config = require('../config');
const mailgun = require('mailgun-js')(config.email);

exports.sendEmail = (recipient, message, attachment) =>
  new Promise((resolve, reject) => {
    // console.log(recipient);
    // console.log(message);
    const data = {
      from: 'Plugwin <info@plugwin.com>',
      to: recipient,
      subject: message.subject,
      text: message.text,
      inline: attachment,
      html: message.html,
    };

    mailgun.messages().send(data, (error) => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });
