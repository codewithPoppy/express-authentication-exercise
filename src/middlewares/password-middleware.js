import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

import { User } from '../models';
import { SECRET as secretOrKey } from '../constants';

const opts = {
  secretOrKey,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

passport.use(
  new Strategy(opts, async ({ id }, done) => {
    try {
      let user = await User.findById(id);
      if (!user) {
        throw new Error('User not Found');
      }
      return done(null, user.getUserInfo());
    } catch (err) {
      done(null, false);
    }
  })
);
