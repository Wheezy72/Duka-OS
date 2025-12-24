import { PrismaClient, User } from "@prisma/client";
import crypto from "crypto";

/**
 * UserService handles authentication and user lookups.
 * It is pure business logic with no Electron dependencies.
 */
export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  private hashPin(pin: string): string {
    // PINs are hashed so we never store raw codes in the database.
    return crypto.createHash("sha256").update(pin).digest("hex");
  }

  async loginWithPin(pin: string): Promise<User> {
    const pinHash = this.hashPin(pin);

    const user = await this.prisma.user.findFirst({
      where: { pinHash },
    });

    if (!user) {
      throw new Error("Invalid PIN");
    }

    return user;
  }
}