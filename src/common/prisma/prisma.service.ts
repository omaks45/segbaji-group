import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
    {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        const adapter = new PrismaNeon({
        connectionString: process.env.DATABASE_URL!,
        });
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Connected to Neon via Prisma (adapter-neon)');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}