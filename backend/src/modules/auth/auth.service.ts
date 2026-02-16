import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'default-secret';
    this.jwtExpiresIn = this.configService.get('JWT_EXPIRES_IN') || '15m';
    this.jwtRefreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 查找用户
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
          { phone: username },
        ],
        status: 'ACTIVE',
      },
      include: {
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: loginDto.ip || null,
      },
    });

    // 生成Token
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      companies: user.companyUsers.map(cu => ({
        id: cu.company.id,
        name: cu.company.companyName,
        role: cu.role,
        isDefault: cu.isDefault,
      })),
      ...tokens,
    };
  }

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto) {
    const { username, password, email, phone, companyName } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email || undefined },
          { phone: phone || undefined },
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException('用户名、邮箱或手机号已存在');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户和企业
    const result = await this.prisma.$transaction(async (tx) => {
      // 创建企业
      const company = await tx.company.create({
        data: {
          companyName,
          status: 'PENDING', // 需要审核
        },
      });

      // 创建用户
      const user = await tx.user.create({
        data: {
          username,
          email,
          phone,
          passwordHash,
          realName: registerDto.realName,
        },
      });

      // 创建用户企业关联
      await tx.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'ADMIN',
          isDefault: true,
        },
      });

      return { user, company };
    });

    // 生成Token
    const tokens = await this.generateTokens(result.user);

    return {
      user: this.sanitizeUser(result.user),
      company: {
        id: result.company.id,
        name: result.company.companyName,
        status: result.company.status,
      },
      ...tokens,
    };
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = jwt.verify(refreshToken, this.jwtSecret) as any;
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Token已过期或无效');
    }
  }

  /**
   * 生成Token
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.jwtRefreshExpiresIn },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
    };
  }

  /**
   * 解析过期时间
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }

  /**
   * 清理用户敏感信息
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * 验证Token
   */
  async validateToken(token: string) {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      return null;
    }
  }
}
