import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Sesión administrativa requerida.');
    try {
      req.admin = this.jwt.verify(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida.');
    }
  }
}
