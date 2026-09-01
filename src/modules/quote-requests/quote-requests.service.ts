import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { QuoteRequestQueryDto } from './dto/quote-request-query.dto';
import { UpdateQuoteRequestStatusDto } from './dto/update-quote-request-status.dto';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class QuoteRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly clientsService: ClientsService,
  ) {}

  async create(dto: CreateQuoteRequestDto) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.isActive) {
      throw new NotFoundException('serviceId does not match an active service');
    }

    const quoteRequest = await this.prisma.quoteRequest.create({
      data: { ...dto, desiredStartDate: new Date(dto.desiredStartDate) },
    });

    // Both emails fire after the record is safely saved — a failed send
    // shouldn't cost the visitor their submitted lead.
    await Promise.all([
      this.mail.sendMail(
        this.config.get<string>('mail.adminNotificationEmail')!,
        `New quote request — ${service.name}`,
        `<p><strong>${dto.fullName}</strong> (${dto.email}, ${dto.phone}) requested a quote for <strong>${service.name}</strong>.</p>
          <p>Location: ${dto.projectLocation}<br/>Budget: ${dto.budgetRange}<br/>Desired start: ${dto.desiredStartDate}</p>
          <p>${dto.description}</p>`,
      ),
      this.mail.sendMail(
        dto.email,
        "We've received your quote request — Segbaji & Son",
        `<p>Hi ${dto.fullName},</p>
          <p>Thanks for reaching out about <strong>${service.name}</strong>. Our team will review your request and get back to you shortly.</p>`,
      ),
    ]);

    return { message: "Thanks — we'll be in touch shortly.", id: quoteRequest.id };
  }

  async findSummary() {
    const grouped = await this.prisma.quoteRequest.groupBy({ by: ['status'], _count: true });
    const counts: Record<'NEW' | 'CONTACTED' | 'WON' | 'LOST', number> = {
      NEW: 0, CONTACTED: 0, WON: 0, LOST: 0,
    };
    for (const row of grouped) counts[row.status] = row._count;
    return {
      total: counts.NEW + counts.CONTACTED + counts.WON + counts.LOST,
      new: counts.NEW,
      contacted: counts.CONTACTED,
      won: counts.WON,
      lost: counts.LOST,
    };
  }

  async findAll(query: QuoteRequestQueryDto) {
      const where = this.buildFilterWhere(query);

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.quoteRequest.findMany({
          where,
          ...paginationSkipTake(query.page, query.pageSize),
          orderBy: { createdAt: 'desc' },
          include: { service: { select: { name: true } } },
        }),
        this.prisma.quoteRequest.count({ where }),
      ]);

      return {
        items: rows.map((r) => ({ ...r, serviceName: r.service.name })),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    }

  private buildFilterWhere(query: QuoteRequestQueryDto): Prisma.QuoteRequestWhereInput {
    return {
      ...(query.status && { status: query.status }),
      ...(query.serviceId && { serviceId: query.serviceId }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  findAllForExport(query: QuoteRequestQueryDto) {
    return this.prisma.quoteRequest.findMany({
      where: this.buildFilterWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { service: { select: { name: true } } },
    });
  }

  async findOne(id: string) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: { service: { select: { name: true } } },
    });
    if (!quoteRequest) throw new NotFoundException('Quote request not found');
    return quoteRequest;
  }

  async updateStatus(id: string, dto: UpdateQuoteRequestStatusDto) {
    await this.findOne(id); // 404s cleanly before attempting the update
    return this.prisma.quoteRequest.update({ where: { id }, data: { status: dto.status } });
  }


  // new method:
  async convertToClient(id: string) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({ where: { id } });
    if (!quoteRequest) throw new NotFoundException('Quote request not found');
    if (quoteRequest.convertedToClientId) {
      throw new BadRequestException('This quote request has already been converted to a client');
    }

    const { client, created } = await this.clientsService.findOrCreateFromLead({
      fullName: quoteRequest.fullName,
      email: quoteRequest.email,
      phone: quoteRequest.phone,
      source: 'QUOTE_REQUEST',
    });

    await this.prisma.quoteRequest.update({
      where: { id },
      data: { convertedToClientId: client.id },
    });

    return {
      message: created ? 'Client created and linked' : 'Linked to existing client',
      clientId: client.id,
      created,
    };
  }
}