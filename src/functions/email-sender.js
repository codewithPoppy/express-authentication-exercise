import sgMail from '@sendgrid/mail';

import { SENDGRID_API_KEY, HOST_EMAIL } from '../constants';

sgMail.setApiKey(SENDGRID_API_KEY);

const sendMail = async (email, subject, text, html) => {
  try {
    const msg = {
      subject,
      text,
      html,
      to: email,
      from: HOST_EMAIL,
    };
    console.log(msg);
    await sgMail.send(msg);
    //     .then(() => {
    //       console.log('MAIL_SENT');
    //     })
    //     .catch((err) => {
    //       console.log('Error while sending mail', err);
    //     });
    //   console.log('MAIL_SENT');
  } catch (err) {
    console.log('ERROR_MAILING', err.message);
  } finally {
    return;
  }
};

export default sendMail;
