import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FourPortunService } from './fourportun.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fourPortunService: FourPortunService,
  ) {}

  /**
   * 同步集装箱数据
   */
  async syncContainer(containerNo: string, companyId?: string) {
    // 从4portun获取数据
    const trackingData = await this.fourPortunService.trackContainer(containerNo);

    // 保存或更新货物数据
    const shipment = await this.saveShipmentData(containerNo, trackingData, companyId);

    return shipment;
  }

  /**
   * 保存货物数据
   */
  private async saveShipmentData(containerNo: string, data: any, companyId?: string) {
    const {
      blNo,
      bookingNo,
      carrierCode,
      carrierName,
      originPort,
      destinationPort,
      etd,
      eta,
      atd,
      ata,
      status,
      nodes,
    } = data;

    // 查找或创建货物
    const shipment = await this.prisma.shipment.upsert({
      where: { containerNo },
      update: {
        blNo,
        bookingNo,
        carrierCode,
        carrierName,
        originPort,
        originPortName: originPort,
        destinationPort,
        destinationPortName: destinationPort,
        etd: etd ? new Date(etd) : null,
        eta: eta ? new Date(eta) : null,
        atd: atd ? new Date(atd) : null,
        ata: ata ? new Date(ata) : null,
        status: this.mapStatus(status),
        currentNode: nodes?.[nodes.length - 1]?.nodeCode,
        syncSource: '4portun',
        lastSyncAt: new Date(),
      },
      create: {
        shipmentNo: `SH${Date.now()}`,
        containerNo,
        containerType: '20GP', // 默认值，需从数据中提取
        companyId: companyId || '',
        blNo,
        bookingNo,
        carrierCode,
        carrierName,
        originPort,
        originPortName: originPort,
        destinationPort,
        destinationPortName: destinationPort,
        etd: etd ? new Date(etd) : null,
        eta: eta ? new Date(eta) : null,
        atd: atd ? new Date(atd) : null,
        ata: ata ? new Date(ata) : null,
        status: this.mapStatus(status),
        currentNode: nodes?.[nodes.length - 1]?.nodeCode,
        syncSource: '4portun',
        lastSyncAt: new Date(),
      },
    });

    // 保存节点数据
    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        await this.prisma.shipmentNode.upsert({
          where: {
            shipmentId_nodeCode_eventTime: {
              shipmentId: shipment.id,
              nodeCode: node.nodeCode,
              eventTime: new Date(node.eventTime),
            },
          },
          update: {
            nodeName: node.nodeName,
            location: node.location,
            description: node.description,
            operator: node.operator,
            rawData: node,
          },
          create: {
            shipmentId: shipment.id,
            nodeCode: node.nodeCode,
            nodeName: node.nodeName,
            location: node.location,
            eventTime: new Date(node.eventTime),
            description: node.description,
            operator: node.operator,
            source: '4portun',
            rawData: node,
          },
        });
      }
    }

    return shipment;
  }

  /**
   * 状态映射
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'BOOKED': 'BOOKED',
      'EMPTY_PICKUP': 'EMPTY_PICKUP',
      'GATE_IN': 'GATE_IN',
      'CUSTOMS_RELEASED': 'CUSTOMS_RELEASED',
      'TERMINAL_RELEASED': 'TERMINAL_RELEASED',
      'DEPARTURE': 'DEPARTURE',
      'ARRIVAL': 'ARRIVAL',
      'DISCHARGED': 'DISCHARGED',
      'FULL_PICKUP': 'FULL_PICKUP',
      'EMPTY_RETURN': 'EMPTY_RETURN',
      'COMPLETED': 'COMPLETED',
    };
    return statusMap[status] || 'BOOKED';
  }
}
