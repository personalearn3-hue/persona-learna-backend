import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Config } from 'src/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService<Config, true>) {
    const mailConfig = configService.get('mail', { infer: true });
    this.from = mailConfig.from;
    this.enabled = Boolean(mailConfig.host && mailConfig.user && mailConfig.pass);

    if (!this.enabled) {
      this.logger.warn(
        'Mail is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — emails will not be sent.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.port === 465,
      auth: this.enabled ? { user: mailConfig.user, pass: mailConfig.pass } : undefined,
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Mail is not configured; cannot send verification email.');
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Your PersonaLearna verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });
  }

  async sendPasswordResetLink(to: string, resetUrl: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Mail is not configured; cannot send password reset email.');
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your PersonaLearna password',
      text: `Reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
      html: `<p>You requested a password reset. Click the link below to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  }
}
