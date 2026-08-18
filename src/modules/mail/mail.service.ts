import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AppConfig } from './../../common/config/app-config';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private fromAddress!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const mailConfig = this.config.get<AppConfig['mail']>('mail')!;

    // Gmail requires the visible "from" to match the authenticated
    // account — no separate MAIL_FROM_ADDRESS to configure here.
    this.fromAddress = `"${mailConfig.fromName}" <${mailConfig.user}>`;

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure, // 465 = implicit TLS, 587 = STARTTLS
      auth: {
        user: mailConfig.user,
        pass: mailConfig.password,
      },
    });
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