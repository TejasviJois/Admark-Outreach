import { AuthenticationError, NotFoundError } from "@/lib/errors/domain-error";
import type { AuthProvider } from "@/providers/auth/auth.provider";
import { createAuthProvider } from "@/providers/auth/supabase-auth.provider";
import type { UserWithTenant } from "@/repositories/base.repository";
import { UserRepository } from "@/repositories/user/user.repository";
import { logger } from "@/utils/logger";

export type CurrentUserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
  };
};

export class AuthService {
  constructor(
    private readonly authProvider: AuthProvider = createAuthProvider(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  async getCurrentUserProfile(): Promise<CurrentUserProfile> {
    const authUser = await this.authProvider.getCurrentUser();

    if (!authUser) {
      throw new AuthenticationError();
    }

    let profile = await this.userRepository.findByAuthUserId(
      authUser.authUserId,
    );

    if (!profile) {
      profile = await this.bootstrapVersionOneProfile(authUser);
    }

    return this.toProfile(profile);
  }

  private async bootstrapVersionOneProfile(
    authUser: {
      authUserId: string;
      email: string | null;
      fullName: string | null;
    },
  ): Promise<UserWithTenant> {
    if (!authUser.email) {
      throw new NotFoundError("User not found");
    }

    const tenantId = await this.userRepository.findDefaultTenantId();

    if (!tenantId) {
      throw new NotFoundError("Default tenant not found");
    }

    logger.info("Bootstrapping Version 1 user profile", {
      authUserId: authUser.authUserId,
    });

    await this.userRepository.create({
      tenantId,
      authUserId: authUser.authUserId,
      fullName: authUser.fullName ?? authUser.email,
      email: authUser.email,
      role: "owner",
    });

    const profile = await this.userRepository.findByAuthUserId(
      authUser.authUserId,
    );

    if (!profile) {
      throw new NotFoundError("User not found");
    }

    return profile;
  }

  private toProfile(profile: UserWithTenant): CurrentUserProfile {
    return {
      id: profile.user.id,
      email: profile.user.email,
      fullName: profile.user.fullName,
      role: profile.user.role,
      tenant: {
        id: profile.tenant.id,
        name: profile.tenant.name,
        slug: profile.tenant.slug,
        plan: profile.tenant.plan,
        isActive: profile.tenant.isActive,
      },
    };
  }
}
