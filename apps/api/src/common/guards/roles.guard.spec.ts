import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { SessionUser } from '@jmc/shared';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function createContext(user: SessionUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
  });

  function createGuard(): RolesGuard {
    return new RolesGuard(reflector as unknown as Reflector);
  }

  const admin: SessionUser = {
    id: '1',
    username: 'administrator',
    name: 'Administrator JMC',
    email: 'admin@jmc-indonesia.test',
    role: 'ADMIN',
  };

  const operator: SessionUser = {
    id: '2',
    username: 'operator1',
    name: 'Budi Santoso',
    email: 'budi.santoso@jmc-indonesia.test',
    role: 'OPERATOR',
  };

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(createGuard().canActivate(createContext(operator))).toBe(true);
  });

  it('allows admin on ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(createGuard().canActivate(createContext(admin))).toBe(true);
  });

  it('denies operator on ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => createGuard().canActivate(createContext(operator))).toThrow(
      ForbiddenException,
    );
  });

  it('denies request without authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => createGuard().canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('reads roles metadata with ROLES_KEY', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    createGuard().canActivate(createContext(admin));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      undefined,
      undefined,
    ]);
  });
});
