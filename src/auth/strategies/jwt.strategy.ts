import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: number;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'CHANGE_ME_SUPER_SECRET',
    });
  }

  async validate(payload: JwtPayload) {
    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid token');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: { select: { name: true } },
        name: true,
        username: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Esto se pega en req.user
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role.name,
    };
  }
}
