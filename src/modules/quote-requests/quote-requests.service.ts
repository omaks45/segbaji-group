import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, NotificationType } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { QuoteRequestQueryDto } from './dto/quote-request-query.dto';
import { UpdateQuoteRequestStatusDto } from './dto/update-quote-request-status.dto';
import { ClientsService} from '../clients/clients.service';
import { NotificationsService } from '../notification/notification.service';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class QuoteRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly clientsService: ClientsService,
    private readonly notifications: NotificationsService
  ) {}

  async create(dto: CreateQuoteRequestDto) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.isActive) {
      throw new NotFoundException('serviceId does not match an active service');
    }

    const quoteRequest = await this.prisma.quoteRequest.create({
      data: {
        ...dto,
        desiredStartDate: new Date(dto.desiredStartDate),
        // Denormalized at creation time from the service's department, so
        // this record keeps routing to the right team even if the service
        // is later reassigned to a different department.
        departmentId: service.departmentId,
      },
    });

    // In-app notification to every Super Admin, plus the lead(s) of the
    // department this service belongs to (if any) — fire-and-forget, same
    // pattern as everything else here: a failed notification never costs
    // the visitor their submitted lead. notifyUsers() catches and logs
    // its own errors internally, so no .catch() needed on this call.
    void Promise.all([
      this.getSuperAdminIds(),
      service.departmentId ? this.getDepartmentLeadIds(service.departmentId) : Promise.resolve([]),
    ]).then(([superAdminIds, departmentLeadIds]) => {
      const recipientIds = Array.from(new Set([...superAdminIds, ...departmentLeadIds]));
      if (!recipientIds.length) return;
      void this.notifications.notifyUsers({
        recipientIds,
        type: NotificationType.QUOTE_REQUEST,
        title: `New quote request — ${service.name}`,
        body: `${dto.fullName} requested a quote for ${service.name}.`,
        link: `/quote-requests/${quoteRequest.id}`,
      });
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

  /**
   * Every user whose role carries the org-wide write wildcard — same
   * check TasksService uses to find "department leads", just without the
   * departmentId scoping since this list is meant to be org-wide.
   */
  private async getSuperAdminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', role: { permissions: { has: '*:write' } } },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  /**
   * Active users in the given department whose role carries `leads:read`
   * — i.e. Team Leads, not every profession-role in that department.
   */
  private async getDepartmentLeadIds(departmentId: string): Promise<string[]> {
    const leads = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        departmentId,
        role: { permissions: { has: PERMISSIONS.LEADS_READ } },
      },
      select: { id: true },
    });
    return leads.map((l) => l.id);
  }

  /** A user with the org-wide write wildcard sees every department's
   * quote requests; everyone else (Team Leads with `leads:read`) is
   * scoped to their own department. */
  private isOrgWide(user: JwtPayload): boolean {
    return user.permissions.includes('*:write') || user.permissions.includes('*');
  }

  async findSummary(user: JwtPayload) {
    const where: Prisma.QuoteRequestWhereInput = this.isOrgWide(user)
      ? {}
      : { departmentId: user.departmentId ?? '__none__' };

    const grouped = await this.prisma.quoteRequest.groupBy({ by: ['status'], _count: true, where });
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

  async findAll(query: QuoteRequestQueryDto, user: JwtPayload) {
      const where = this.buildFilterWhere(query, user);

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

  private buildFilterWhere(query: QuoteRequestQueryDto, user: JwtPayload): Prisma.QuoteRequestWhereInput {
    return {
      ...(query.status && { status: query.status }),
      ...(query.serviceId && { serviceId: query.serviceId }),
      ...(!this.isOrgWide(user) && { departmentId: user.departmentId ?? '__none__' }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  findAllForExport(query: QuoteRequestQueryDto, user: JwtPayload) {
    return this.prisma.quoteRequest.findMany({
      where: this.buildFilterWhere(query, user),
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { service: { select: { name: true } } },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: { service: { select: { name: true } } },
    });
    if (!quoteRequest) throw new NotFoundException('Quote request not found');

    // A Team Lead outside this request's department gets the same 404 a
    // nonexistent id would — no signal that the record exists elsewhere.
    if (!this.isOrgWide(user) && quoteRequest.departmentId !== user.departmentId) {
      throw new NotFoundException('Quote request not found');
    }

    return quoteRequest;
  }

  async updateStatus(id: string, dto: UpdateQuoteRequestStatusDto, user: JwtPayload) {
    await this.findOne(id, user); // 404s cleanly before attempting the update, and enforces department scope
    return this.prisma.quoteRequest.update({ where: { id }, data: { status: dto.status } });
  }


  // new method:
  async convertToClient(id: string, user: JwtPayload) {
    const quoteRequest = await this.findOne(id, user);
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