import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { SessionUser } from '@jmc/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<{ user: SessionUser }>();
    return request.user;
  },
);
