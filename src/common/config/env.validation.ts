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
    ADMIN_NOTIFICATION_EMAIL: Joi.string().email().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().pattern(/^\d+(ms|s|m|h|d|w|y)$/).default('7d'),
    JWT_REFRESH_TTL_DAYS: Joi.number().default(30),
    APP_URL: Joi.string().uri().required(),
    CLOUDINARY_CLOUD_NAME: Joi.string().required(),
    CLOUDINARY_API_KEY: Joi.string().required(),
    CLOUDINARY_API_SECRET: Joi.string().required(),
});