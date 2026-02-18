/**
 * 任务 1.1.2: 输入验证与安全防护 - 自定义验证器
 * 提供常用的自定义验证装饰器
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 手机号验证器
 * 支持中国大陆手机号格式
 */
@ValidatorConstraint({ async: false })
export class IsMobilePhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string, args: ValidationArguments): boolean {
    // 中国大陆手机号正则：1开头，第二位3-9，共11位
    const phoneRegex = /^1[3-9]\d{9}$/;
    return typeof phone === 'string' && phoneRegex.test(phone);
  }

  defaultMessage(args: ValidationArguments): string {
    return '手机号格式不正确，请输入11位有效手机号';
  }
}

/**
 * 手机号验证装饰器
 */
export function IsMobilePhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMobilePhoneConstraint,
    });
  };
}

/**
 * 集装箱号验证器
 * 标准集装箱号格式：4位字母 + 7位数字
 */
@ValidatorConstraint({ async: false })
export class IsContainerNoConstraint implements ValidatorConstraintInterface {
  validate(containerNo: string, args: ValidationArguments): boolean {
    // ISO 6346 标准：4位字母（所有者代码+设备类型）+ 6位数字序列号 + 1位校验码
    const containerRegex = /^[A-Z]{4}\d{7}$/;
    return typeof containerNo === 'string' && containerRegex.test(containerNo);
  }

  defaultMessage(args: ValidationArguments): string {
    return '集装箱号格式不正确，应为4位大写字母+7位数字（如：ABCU1234567）';
  }
}

/**
 * 集装箱号验证装饰器
 */
export function IsContainerNo(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsContainerNoConstraint,
    });
  };
}

/**
 * 提单号验证器
 */
@ValidatorConstraint({ async: false })
export class IsBillOfLadingNoConstraint implements ValidatorConstraintInterface {
  validate(blNo: string, args: ValidationArguments): boolean {
    // 提单号通常由字母和数字组成，长度在8-20位之间
    const blRegex = /^[A-Z0-9]{8,20}$/i;
    return typeof blNo === 'string' && blRegex.test(blNo);
  }

  defaultMessage(args: ValidationArguments): string {
    return '提单号格式不正确，应为8-20位字母或数字';
  }
}

/**
 * 提单号验证装饰器
 */
export function IsBillOfLadingNo(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBillOfLadingNoConstraint,
    });
  };
}

/**
 * 统一社会信用代码验证器
 */
@ValidatorConstraint({ async: false })
export class IsCreditCodeConstraint implements ValidatorConstraintInterface {
  validate(code: string, args: ValidationArguments): boolean {
    // 统一社会信用代码：18位，由数字和大写字母组成（不含I、O、Z、S、V）
    const codeRegex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/;
    return typeof code === 'string' && codeRegex.test(code);
  }

  defaultMessage(args: ValidationArguments): string {
    return '统一社会信用代码格式不正确';
  }
}

/**
 * 统一社会信用代码验证装饰器
 */
export function IsCreditCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCreditCodeConstraint,
    });
  };
}

/**
 * 港口代码验证器
 * 标准5位港口代码
 */
@ValidatorConstraint({ async: false })
export class IsPortCodeConstraint implements ValidatorConstraintInterface {
  validate(code: string, args: ValidationArguments): boolean {
    // UN/LOCODE 港口代码：2位国家代码 + 3位地点代码
    const portRegex = /^[A-Z]{5}$/;
    return typeof code === 'string' && portRegex.test(code);
  }

  defaultMessage(args: ValidationArguments): string {
    return '港口代码格式不正确，应为5位大写字母（如：CNSHG）';
  }
}

/**
 * 港口代码验证装饰器
 */
export function IsPortCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortCodeConstraint,
    });
  };
}

/**
 * 日期范围验证器
 * 验证结束日期是否晚于开始日期
 */
@ValidatorConstraint({ async: false })
class IsDateRangeValidConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const startDate = (args.object as any)[relatedPropertyName];
    
    if (!startDate || !endDate) {
      return true; // 如果任一日期为空，跳过验证
    }
    
    return new Date(endDate) >= new Date(startDate);
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `结束日期必须晚于${relatedPropertyName}`;
  }
}

/**
 * 日期范围验证装饰器
 * @param property 开始日期字段名
 */
export function IsDateAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsDateRangeValidConstraint,
    });
  };
}
