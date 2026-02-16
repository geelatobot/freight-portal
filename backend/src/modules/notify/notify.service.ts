import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class NotifyService {
  private readonly wechatAppId: string;
  private readonly wechatSecret: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    this.wechatAppId = this.configService.get('WECHAT_APPID') || '';
    this.wechatSecret = this.configService.get('WECHAT_SECRET') || '';
  }

  /**
   * 发送微信小程序模板消息
   */
  async sendMiniProgramMessage(openid: string, templateId: string, data: any, page?: string) {
    try {
      // 获取access_token
      const accessToken = await this.getWechatAccessToken();

      // 发送模板消息
      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          touser: openid,
          template_id: templateId,
          page: page || 'pages/index/index',
          data,
        },
      );

      return response.data;
    } catch (error) {
      console.error('发送微信消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送货物状态变更通知
   */
  async sendShipmentStatusNotification(
    userId: string,
    containerNo: string,
    status: string,
    location?: string,
  ) {
    // 获取用户的微信openid
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) {
      // 如果没有绑定微信，记录日志
      console.log(`用户 ${userId} 未绑定微信，跳过通知`);
      return;
    }

    // 模板消息数据
    const templateData = {
      thing1: { value: containerNo },
      thing2: { value: status },
      thing3: { value: location || '未知' },
      time4: { value: new Date().toLocaleString('zh-CN') },
    };

    // 发送消息
    // await this.sendMiniProgramMessage(openid, 'shipment_status_template_id', templateData);

    // 记录通知日志
    console.log(`发送货物状态通知: ${containerNo} - ${status}`);
  }

  /**
   * 发送账单通知
   */
  async sendBillNotification(userId: string, billNo: string, amount: number) {
    console.log(`发送账单通知: ${billNo} - ${amount}`);
  }

  /**
   * 获取微信access_token
   */
  private async getWechatAccessToken(): Promise<string> {
    const response = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.wechatAppId}&secret=${this.wechatSecret}`,
    );
    return response.data.access_token;
  }
}
