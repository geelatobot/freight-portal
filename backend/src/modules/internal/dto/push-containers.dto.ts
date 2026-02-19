/**
 * 推送集装箱数据 DTO
 */

import { IsString, IsOptional, IsArray, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PushSource {
  FOURPORTUN = '4portun',
  MANUAL = 'manual',
  API = 'api',
}

export class ContainerNodeDto {
  @IsString()
    nodeCode: string;

  @IsString()
    nodeName: string;

  @IsString()
  @IsOptional()
    location?: string;

  @IsString()
  @IsOptional()
    locationCode?: string;

  @IsString()
    eventTime: string;

  @IsString()
  @IsOptional()
    description?: string;

  @IsString()
  @IsOptional()
    operator?: string;

  @IsString()
  @IsOptional()
    vesselName?: string;

  @IsString()
  @IsOptional()
    voyageNo?: string;
}

export class ContainerDataDto {
  @IsString()
    containerNo: string;

  @IsString()
  @IsOptional()
    containerType?: string;

  @IsString()
  @IsOptional()
    blNo?: string;

  @IsString()
  @IsOptional()
    bookingNo?: string;

  @IsString()
  @IsOptional()
    carrierCode?: string;

  @IsString()
  @IsOptional()
    carrierName?: string;

  @IsString()
  @IsOptional()
    originPort?: string;

  @IsString()
  @IsOptional()
    destinationPort?: string;

  @IsString()
  @IsOptional()
    etd?: string;

  @IsString()
  @IsOptional()
    eta?: string;

  @IsString()
  @IsOptional()
    atd?: string;

  @IsString()
  @IsOptional()
    ata?: string;

  @IsString()
  @IsOptional()
    status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerNodeDto)
  @IsOptional()
    nodes?: ContainerNodeDto[];
}

export class PushContainersDto {
  @IsEnum(PushSource)
    source: PushSource;

  @IsString()
  @IsOptional()
    pushType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerDataDto)
    containers: ContainerDataDto[];

  @IsObject()
  @IsOptional()
    metadata?: Record<string, any>;
}
