import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class AiService {
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('KIMI_API_KEY');
    this.baseUrl = this.configService.get('KIMI_API_URL') || 'https://api.moonshot.cn/v1';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * 智能客服对话
   */
  async chat(message: string, userId?: string, companyId?: string) {
    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt();

    // 调用Kimi API
    const response = await this.httpClient.post('/chat/completions', {
      model: 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = response.data.choices[0]?.message?.content || '抱歉，我没有理解您的问题。';

    // 保存对话记录
    if (userId) {
      await this.saveChatHistory(userId, companyId, message, reply);
    }

    return {
      reply,
      sessionId: response.data.id,
    };
  }

  /**
   * 货物状态查询
   */
  async queryShipmentStatus(containerNo: string, companyId?: string) {
    // 查询货物信息
    const shipment = await this.prisma.shipment.findUnique({
      where: { containerNo },
      include: {
        nodes: {
          orderBy: { eventTime: 'desc' },
          take: 5,
        },
        company: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!shipment) {
      return {
        reply: `抱歉，未找到集装箱 ${containerNo} 的跟踪信息。请检查箱号是否正确，或联系客服协助查询。`,
        data: null,
      };
    }

    // 构建货物状态描述
    const statusDescription = this.buildShipmentDescription(shipment);

    return {
      reply: statusDescription,
      data: shipment,
    };
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(): string {
    return `你是货代客户门户的智能客服助手，专门帮助客户查询货物状态、了解物流信息。

你的能力包括：
1. 查询集装箱/提单的跟踪状态
2. 解答物流相关问题
3. 提供船期、航线信息
4. 协助处理异常情况

回答要求：
- 使用专业但易懂的语言
- 提供准确、及时的信息
- 如果无法回答，引导用户联系人工客服
- 保持礼貌和耐心

当前时间：${new Date().toLocaleString('zh-CN')}`;
  }

  /**
   * 构建货物状态描述
   */
  private buildShipmentDescription(shipment: any): string {
    const nodes = shipment.nodes || [];
    const latestNode = nodes[0];

    let description = `集装箱 **${shipment.containerNo}** 的最新状态：\n\n`;

    if (latestNode) {
      description += `📍 **当前节点**：${latestNode.nodeName}\n`;
      description += `🕐 **发生时间**：${new Date(latestNode.eventTime).toLocaleString('zh-CN')}\n`;
      if (latestNode.location) {
        description += `📌 **发生地点**：${latestNode.location}\n`;
      }
    }

    description += `\n🚢 **船司**：${shipment.carrierName || '待定'}\n`;
    description += `🌊 **航线**：${shipment.originPortName} → ${shipment.destinationPortName}\n`;

    if (shipment.etd) {
      description += `📅 **预计开船**：${new Date(shipment.etd).toLocaleDateString('zh-CN')}\n`;
    }
    if (shipment.eta) {
      description += `📅 **预计到港**：${new Date(shipment.eta).toLocaleDateString('zh-CN')}\n`;
    }

    if (nodes.length > 1) {
      description += '\n📋 **最近节点**：\n';
      nodes.slice(1, 4).forEach((node: any, index: number) => {
        description += `${index + 1}. ${node.nodeName} - ${new Date(node.eventTime).toLocaleDateString('zh-CN')}\n`;
      });
    }

    return description;
  }

  /**
   * 保存对话历史
   */
  private async saveChatHistory(userId: string, companyId: string | undefined, question: string, answer: string) {
    // 可以保存到数据库用于后续分析
    // await this.prisma.chatHistory.create({...})
  }
}
