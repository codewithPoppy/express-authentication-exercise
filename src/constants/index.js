require('dotenv').config();

export const PORT = process.env.PORT || process.env.APP_PORT;
export const DB = process.env.APP_DB;
export const DOMAIN = process.env.APP_DOMAIN;
export const SENDGRID_API_KEY = process.env.APP_SENDGRID_API;
export const SECRET = process.env.APP_SECRET;
export const HOST_EMAIL = process.env.APP_HOST_EMAIL;
