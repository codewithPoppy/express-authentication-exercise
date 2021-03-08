import { Router } from 'express';
import { randomBytes } from 'crypto';
import { join } from 'path';

import { DOMAIN } from '../constants';
import { User } from '../models';
import {
  RegisterValidations,
  AuthenticateValidations,
  ResetPassword,
} from '../validators';
import validationMiddleware from '../middlewares/validator-middleware';
import sendMail from '../functions/email-sender';
import { userAuth } from '../middlewares/auth-guard';

const router = Router();

/**
 * @description To create a new user Account
 * @access public
 * @api  /users/api/register
 * @type POST
 */
router.post(
  '/api/register',
  RegisterValidations,
  validationMiddleware,
  async (req, res) => {
    try {
      let { username, email } = req.body;

      // check if the username is taken or not
      let user = await User.findOne({ username });
      // if the user with that username already exists
      if (user) {
        return res.json({
          success: false,
          message: 'Username already exists',
        });
      }

      user = await User.findOne({ email });
      // Check if the user exists with that email
      if (user) {
        return res.status(400).json({
          success: false,
          message:
            'Email is already registered. Did you forget the password. Try resetting it',
        });
      }

      user = new User({
        ...req.body,
        verificationCode: randomBytes(20).toString('hex'),
      });

      /** saving the newly created user into the database */
      await user.save();

      /** send the email to the user with a verification link */
      let htmlEmailCode = `
        <div>
            <h1>Hello, ${user.username}</h1>
            <p>Please click the following link to verify your account.</p>
            <a href="${DOMAIN}users/verify-now/${user.verificationCode}">Verify Now<a>
        </div>`;

      await sendMail(
        user.email,
        'Verification Account',
        'Please verify Your Account.',
        htmlEmailCode
      );
      return res.status(201).json({
        success: true,
        message:
          'Hurray! Your account is created. Please verify your email address',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        messag: 'An error occured while registering users',
      });
    }
  }
);

/**
 * @description To verify a new user's account via email
 * @api /users/verify-now/:verificationCode
 * @access PUBLIC <Only via email>
 * @type GET
 */
router.get('/verify-now/:verificationCode', async (req, res) => {
  try {
    let { verificationCode } = req.params;

    let user = await User.findOne({ verificationCode });
    if (!user) {
      return res.status(401).json({
        message: 'Unauthorized access. Invalid Verification Code',
      });
    }
    user.verified = true;
    user.verificationCode = undefined;
    await user.save();
    return res.sendFile(
      join(__dirname, '../templates/verification-success.html')
    );
  } catch (err) {
    return res.sendFile(join(__dirname, '../templates/errors.html'));
  }
});

/**
 * @description To authenticate a user and get the auth token during Login
 * @api /users/api/authenticate
 * @access PUBLIC
 * @type POST
 */
router.post(
  '/api/authenticate',
  AuthenticateValidations,
  validationMiddleware,
  async (req, res) => {
    try {
      let { username, password } = req.body;

      let user = await User.findOne({ username });
      if (!user) {
        return res.status(404).send({
          success: false,
          message: 'Username not found',
        });
      }

      if (!(await user.comparePassword(password))) {
        return res.status(401).send({
          success: false,
          message: 'Incorrect Password',
        });
      }

      let token = await user.generateJWT();
      return res.status(200).send({
        success: true,
        // user: user.getUserInfo(),
        token: `Bearer ${token}`,
        message: 'Hurray! You are now logged In',
      });
    } catch (err) {
      console.log('ERR', err.message);
      return res.status(500).send({
        success: false,
        message: 'An error occured',
      });
    }
  }
);

/**
 * @description To get the authenticated user profile
 * @api /users/api/authenticate
 * @access PRIVATE
 * @type GET
 */
router.get('/api/authenticate', userAuth, async (req, res) => {
  return res.status(200).send({
    user: req.user,
  });
});

/**
 * @description To initiate the password reset process
 * @api /users/api/reset-password/
 * @access Public
 * @type POST
 */
router.put(
  '/api/reset-password',
  ResetPassword,
  validationMiddleware,
  async (req, res) => {
    try {
      let { email } = req.body;

      let user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'user with this email is not found',
        });
      }

      user.generatePasswordReset();
      await user.save();

      /** Send the password Reset link via email */
      let html = `
            <div>
                <h1>Hello, ${user.username}</h1>
                <p>Please click the following link to reset your password</p>
                <p>If this password reset request is not created by you then you can ignore this email</p>
                <a href="${DOMAIN}users/reset-password-now/${user.resetPasswordToken}">Verify Now</a>
            </div>
        `;
      await sendMail(
        user.email,
        'Reset Password',
        'Please reset your password',
        html
      );
      return res.status(201).json({
        success: true,
        message:
          'Password Reset Link is sent in your email. Please Verify Now !!',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'An error occured',
      });
    }
  }
);

/**
 * @description To render the reset password page
 * @api /users/reset-password/:resetPasswordToken
 * @access PRIVATE Restricted via Email
 * @type GET
 */
router.get('/reset-password-now/:resetPasswordToken', async (req, res) => {
  try {
    let { resetPasswordToken } = req.params;
    let user = User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Password reset token is invalid or has expired',
      });
    }
    return res.sendFile(
      join(__dirname + '../templates/password-reset-success.html')
    );
  } catch (err) {
    return res.sendFile(join(__dirname + '../templates/errors.html'));
  }
});

/**
 * @description To reset the password
 * @api /users/api/reset-password-now
 * @access Restricted via email
 * @type  POST
 */
router.post('/api/reset-password-now', async (req, res) => {
  try {
    let { password, resetPasswordToken } = req.body;
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Password reset token is invlid or has expired',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresIn = undefined;

    await user.save();

    // Sending notifications email about the password reset successful process
    /** send the email to the user with a verification link */
    let html = `
        <div>
            <h1>Hello, ${user.username}</h1>
            <p>Your password is reset Successfully</p>
            <p>If this reset is not done by you then you can contact our team</p>
        </div>`;

    await sendMail(
      user.email,
      'Reset Password Successful',
      'Your Password is changed.',
      html
    );

    return res.status(200).json({
      success: true,
      message:
        'Your Password reset request is complete and your password is reseted successfully. Login into your account with your new password',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
});

export default router;
