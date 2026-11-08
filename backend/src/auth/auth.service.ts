import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Single admin bootstrap desde variables de entorno (spec §3.1). */
  async onModuleInit() {
    const username = this.config.get<string>('ADMIN_USERNAME') ?? 'admin';
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!password) return; // sin password no hay bootstrap (seguro por defecto)
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) return;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.create({ data: { username, passwordHash } });
  }

  async login(username: string, password: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return this.jwt.sign({ sub: user.id, username: user.username });
  }
}
