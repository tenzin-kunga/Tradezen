import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT configuration missing');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: { sub: string; email: string; username: string }) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
