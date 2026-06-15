import { tr } from "zod/locales";
import { prisma } from "../lib/prisma.js";
import {
  type CreateUserData,
  type IUserRepository,
  type LoginData,
  type User,
  type UserWithoutPassword,
} from "../types.js";

export default class UserRepository implements IUserRepository {
  async createOne(
    data: Omit<CreateUserData, "passwordConfirm"> & { id: string },
  ): Promise<UserWithoutPassword> {
    const { id, username, email, created_at, deleted_at } =
      await prisma.users.create({
        data,
        select: {
          id: true,
          username: true,
          email: true,
          created_at: true,
          deleted_at: true,
        },
      });

    const serializedData = {
      id,
      username,
      email,
      createdAt: created_at,
      deletedAt: deleted_at,
    };

    return serializedData;
  }

  async getByEmail(
    email: string,
  ): Promise<(User & { password: string }) | null> {
    const result = await prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (!result) return null;

    const serializedData = {
      id: result.id,
      username: result.username,
      email: result.email,
      password: result.password,
      createdAt: result.created_at,
      deletedAt: result.deleted_at,
    };

    return serializedData;
  }

  async getByUsernameOnly(
    username: string,
  ): Promise<Pick<User, "username"> | null> {
    const result = await prisma.users.findFirst({
      select: {
        username: true,
      },
      where: {
        username,
        deleted_at: null,
      },
    });

    if (!result) return null;

    const serializedData = {
      username: result.username,
    };

    return serializedData;
  }
}
