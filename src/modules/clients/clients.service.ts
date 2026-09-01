import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Client, ClientSource, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';

interface FindOrCreateInput {
  fullName: string;
  email: string;
  phone?: string | null;
  source: ClientSource;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: { ...dto, source: ClientSource.MANUAL },
      });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  /**
   * Shared by QuoteRequestsService and ContactMessagesService's convert
   * actions — one place that owns "does a client with this email already
   * exist" so both lead types land on the same client record instead of
   * duplicating the dedup logic.
   */
  async findOrCreateFromLead(
    input: FindOrCreateInput,
  ): Promise<{ client: Client; created: boolean }> {
    const existing = await this.prisma.client.findUnique({ where: { email: input.email } });
    if (existing) return { client: existing, created: false };

    try {
      const client = await this.prisma.client.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? undefined,
          source: input.source,
        },
      });
      return { client, created: true };
    } catch (err) {
      // Lost a race to a concurrent conversion for the same new email —
      // the client now exists; link to it instead of failing the request.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const client = await this.prisma.client.findUniqueOrThrow({ where: { email: input.email } });
        return { client, created: false };
      }
      throw err;
    }
  }

  async findSummary() {
    const [total, active] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { isActive: true } }),
    ]);
    return { total, active, inactive: total - active };
  }

  async findAll(query: ClientQueryDto) {
    const where = this.buildFilterWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  private buildFilterWhere(query: ClientQueryDto): Prisma.ClientWhereInput {
    return {
      ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }),
      ...(query.source && { source: query.source }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { organization: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  findAllForExport(query: ClientQueryDto) {
    return this.prisma.client.findMany({
      where: this.buildFilterWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        quoteRequests: {
          select: { id: true, status: true, createdAt: true, service: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        contactMessages: {
          select: { id: true, status: true, subject: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOneOrThrow(id);
    try {
      return await this.prisma.client.update({ where: { id }, data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  private async findOneOrThrow(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A client with this email already exists');
    }
    return err;
  }
}