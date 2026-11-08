import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

export class LoginDto {
  @IsString()
  username!: string;
  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const token = await this.auth.login(dto.username, dto.password);
    if (!token) throw new UnauthorizedException('Credenciales inválidas.');
    return { accessToken: token };
  }
}
