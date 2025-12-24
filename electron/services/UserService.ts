import { PrismaClient, User, UserRole } from "@prisma/client";
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

  /**
   * Creates a new user with the given role and PIN.
   * Simple checks only; we assume the caller enforces that only OWNER can call this.
   */
  async createUser(pin: string, role: UserRole): Promise<User> {
    const trimmed = pin.trim();
    if (!trimmed) {
      throw new Error("PIN is required");
    }
    if (trimmed.length < 4 || trimmed.length > 6) {
      throw new Error("PIN must be 4–6 digits");
    }
    if (!/^\d+$/.test(trimmed)) {
      throw new Error("PIN must contain digits only");
    }
    // Basic weak-PIN guard
    const weakPins = new Set(["0000", "1111", "1234", "2222", "3333", "4444"]);
    if (weakPins.has(trimmed)) {
      throw new Error("Choose a stronger PIN");
    }

    const pinHash = this.hashPin(trimmed);

    const existing = await this.prisma.user.findFirst({
      where: { pinHash },
    });

    if (existing) {
      throw new Error("This PIN is already in use");
    }

    return this.prisma.user.create({
      data: {
        pinHash,
        role,
      },
    });
  }
}