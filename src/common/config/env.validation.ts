/* eslint-disable prettier/prettier */
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().default(4000),
    DATABASE_URL: Joi.string().uri().required(),
    REDIS_URL: Joi.string().uri().required(),
    CORS_ALLOWED_ORIGINS: Joi.string().allow('').default(''),
    SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
    SUPER_ADMIN_PASSWORD: Joi.string().optional(),
    MAIL_HOST: Joi.string().required(),
    MAIL_PORT: Joi.number().required(),
    MAIL_USER: Joi.string().email().required(),
    MAIL_PASSWORD: Joi.string().required(),
    MAIL_FROM_NAME: Joi.string().default('Segbaji & Son'),
});