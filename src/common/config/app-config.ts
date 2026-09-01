export interface AppConfig {
    appUrl: string;
    app: {
        port: number;
        nodeEnv: string;
        corsAllowedOrigins: string[];
    };
    database: {
        url: string;
        directUrl: string;
    };
    redis: {
        url: string;
    };
    mail: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        fromName: string;
        adminNotificationEmail: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshTtlDays: number;
    };
    cloudinary: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
    };
}

export default (): AppConfig => ({
    app: {
        port: parseInt(process.env.PORT ?? '4000', 10),
        nodeEnv: process.env.NODE_ENV ?? 'development',
        corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
    database: {
        url: process.env.DATABASE_URL!,
        directUrl: process.env.DIRECT_URL!,
    },
    redis: {
        url: process.env.REDIS_URL!,
    },
    mail: {
        host: process.env.MAIL_HOST!,
        port: parseInt(process.env.MAIL_PORT ?? '465', 10),
        secure: parseInt(process.env.MAIL_PORT ?? '465', 10) === 465,
        user: process.env.MAIL_USER!,
        password: process.env.MAIL_PASSWORD!,
        fromName: process.env.MAIL_FROM_NAME ?? 'Segbaji & Son',
        adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL!,
    },
    jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
        refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '30', 10),
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        apiSecret: process.env.CLOUDINARY_API_SECRET!,
    },
    appUrl: process.env.APP_URL!,
});