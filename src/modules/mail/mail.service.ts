import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { AppConfig } from './../../common/config/app-config';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private fromAddress!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const mailConfig = this.config.get<AppConfig['mail']>('mail')!;

    this.fromAddress = `"${mailConfig.fromName}" <${mailConfig.user}>`;

    // `family: 4` is a genuine, working Nodemailer/Node runtime option —
    // it's just missing from SMTPTransport.Options' type definitions.
    // `as` (assertion) instead of `:` (annotation) skips TS's excess
    // property check for this one known gap, without losing type
    // checking on every other field.
    const transportOptions = {
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure, // 465 = implicit TLS, 587 = STARTTLS
      family: 4,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
      },
    } as SMTPTransport.Options;

    this.transporter = nodemailer.createTransport(transportOptions);
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

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html,
    });
  }
}