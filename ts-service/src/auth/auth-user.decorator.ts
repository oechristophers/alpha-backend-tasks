import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException('Auth user was not attached to request');
    }

    return request.user;
  },
);
