import { validationResult } from 'express-validator';

// custom middleware
// const customMiddleware = (req, res, next) => {}

const validationMiddleware = (req, res, next) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      errors: errors.array(),
    });
  }
  next();
};
export default validationMiddleware;
