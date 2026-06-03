// Verifies that the admin "Edit User" flow actually persists a new password.
// Regression for: update() silently dropped the password (DTO had no `password`
// field and the service never hashed it), so logins with the "new" password failed.

const userFindUnique = jest.fn();
const userFindFirst = jest.fn();
const userUpdate = jest.fn();

jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      findFirst: (...a: unknown[]) => userFindFirst(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
    userCenter: { deleteMany: jest.fn(), createMany: jest.fn() },
  },
}));

import bcrypt from 'bcrypt';
import { UserService } from './user.service';

describe('UserService.update password handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userFindUnique.mockResolvedValue({
      id: 'u1',
      username: 'arunpc2',
      email: 'arunpc2@example.com',
      passwordHash: 'OLD_HASH',
      role: 'STAFF',
    });
    userFindFirst.mockResolvedValue(null);
    // Echo the data written back, shaped like userInclude (centers relation).
    userUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'u1', username: 'arunpc2', email: 'arunpc2@example.com', role: 'STAFF', ...data, centers: [] })
    );
  });

  it('hashes and persists a new password when provided', async () => {
    const service = new UserService();
    await service.update('u1', { password: 'abc@123' });

    expect(userUpdate).toHaveBeenCalledTimes(1);
    const data = userUpdate.mock.calls[0][0].data;

    expect(data.passwordHash).toBeDefined();
    expect(data.passwordHash).not.toBe('abc@123'); // stored hashed, not plaintext
    expect(await bcrypt.compare('abc@123', data.passwordHash)).toBe(true);
  });

  it('leaves the password untouched when none is provided', async () => {
    const service = new UserService();
    await service.update('u1', { email: 'new@example.com' });

    const data = userUpdate.mock.calls[0][0].data;
    expect(data.passwordHash).toBeUndefined();
  });
});
