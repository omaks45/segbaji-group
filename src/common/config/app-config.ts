/**
 * Groups validated env vars into a structured config object. Kept as a
 * plain object literal, not a class or DI-heavy abstraction — this is
 * read once at boot and passed around by NestJS's ConfigModule, so
 * there's nothing here that needs more machinery than a function.
 */
export interface AppConfig {
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
    },
});