import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { AppConfig } from '../../common/config/app-config';
import { wrapEmailTemplate, LOGO_CID } from '../../common/mail/email-template.util';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private fromAddress!: string;
  private logoBuffer: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const mailConfig = this.config.get<AppConfig['mail']>('mail')!;

    this.fromAddress = `"${mailConfig.fromName}" <${mailConfig.user}>`;

    const transportOptions = {
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      family: 4,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
      },
    } as SMTPTransport.Options;

    this.transporter = nodemailer.createTransport(transportOptions);

    this.loadLogo();
  }

  private loadLogo() {
    const logoPath = join(process.cwd(), 'assets', 'logo.png');
    try {
      this.logoBuffer = readFileSync(logoPath);
    } catch (err) {
      this.logger.warn(
        `Could not load email logo at ${logoPath}: ${(err as Error).message}. Emails will send without the branded header.`,
      );
    }
  }

  async onModuleDestroy() {
    this.transporter?.close();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      this.logger.error(`SMTP verification failed: ${(err as Error).message}`);
      return false;
    }
  }

  async sendMail(to: string, subject: string, bodyHtml: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html: wrapEmailTemplate(bodyHtml),
      attachments: this.logoBuffer
        ? [{ filename: 'logo.png', content: this.logoBuffer, cid: LOGO_CID }]
        : [],
    });
  }
}