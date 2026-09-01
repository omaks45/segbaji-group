import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ContactMessageQueryDto } from './dto/contact-message-query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message.dto';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class ContactMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly clientsService: ClientsService,
  ) {}

  async create(dto: CreateContactMessageDto) {
    const contactMessage = await this.prisma.contactMessage.create({ data: dto });

    await Promise.all([
      this.mail.sendMail(
        this.config.get<string>('mail.adminNotificationEmail')!,
        `New contact message${dto.subject ? ` — ${dto.subject}` : ''}`,
        `<p><strong>${dto.fullName}</strong> (${dto.email}${dto.phone ? `, ${dto.phone}` : ''}) sent a message.</p>
          <p>${dto.message}</p>`,
      ),
      this.mail.sendMail(
        dto.email,
        "We've received your message — Segbaji & Son",
        `<p>Hi ${dto.fullName},</p><p>Thanks for reaching out — we'll get back to you shortly.</p>`,
      ),
    ]);

    return { message: "Thanks for reaching out — we'll respond soon.", id: contactMessage.id };
  }

  async findSummary() {
    const grouped = await this.prisma.contactMessage.groupBy({ by: ['status'], _count: true });
    const counts: Record<'UNREAD' | 'READ' | 'RESPONDED', number> = { UNREAD: 0, READ: 0, RESPONDED: 0 };
    for (const row of grouped) counts[row.status] = row._count;
    return {
      total: counts.UNREAD + counts.READ + counts.RESPONDED,
      unread: counts.UNREAD,
      read: counts.READ,
      responded: counts.RESPONDED,
    };
  }

  async findAll(query: ContactMessageQueryDto) {
    const where = this.buildFilterWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  private buildFilterWhere(query: ContactMessageQueryDto): Prisma.ContactMessageWhereInput {
    return {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  findAllForExport(query: ContactMessageQueryDto) {
    return this.prisma.contactMessage.findMany({
      where: this.buildFilterWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  /** Opening a message's detail view is what marks it read — standard inbox UX. */
  async findOne(id: string) {
    const contactMessage = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!contactMessage) throw new NotFoundException('Contact message not found');

    if (contactMessage.status === 'UNREAD') {
      return this.prisma.contactMessage.update({ where: { id }, data: { status: 'READ' } });
    }
    return contactMessage;
  }

  async updateStatus(id: string, dto: UpdateContactMessageStatusDto) {
    const contactMessage = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!contactMessage) throw new NotFoundException('Contact message not found');
    return this.prisma.contactMessage.update({ where: { id }, data: { status: dto.status } });
  }


  // new method:
  async convertToClient(id: string) {
    const contactMessage = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!contactMessage) throw new NotFoundException('Contact message not found');
    if (contactMessage.convertedToClientId) {
      throw new BadRequestException('This contact message has already been converted to a client');
    }

    const { client, created } = await this.clientsService.findOrCreateFromLead({
      fullName: contactMessage.fullName,
      email: contactMessage.email,
      phone: contactMessage.phone,
      source: 'CONTACT_MESSAGE',
    });

    await this.prisma.contactMessage.update({
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