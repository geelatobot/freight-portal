import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OcrService {
  private readonly baiduApiKey: string;
  private readonly baiduSecretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baiduApiKey = this.configService.get('BAIDU_OCR_API_KEY');
    this.baiduSecretKey = this.configService.get('BAIDU_OCR_SECRET_KEY');
  }

  async recognizeBill(imageBase64: string) {
    // 调用百度OCR API
    const token = await this.getBaiduToken();
    const response = await axios.post(
      'https://aip.baidubce.com/rest/2.0/ocr/v1/multiple_invoice',
      { image: imageBase64 },
      { params: { access_token: token } },
    );
    return response.data;
  }

  private async getBaiduToken(): Promise<string> {
    const response = await axios.post(
      'https://aip.baidubce.com/oauth/2.0/token',
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: this.baiduApiKey,
          client_secret: this.baiduSecretKey,
        },
      },
    );
    return response.data.access_token;
  }
}
