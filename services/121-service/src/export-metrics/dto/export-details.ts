import { ApiProperty } from '@nestjs/swagger';

export enum ExportType {
  allPeopleAffected = 'all-people-affected',
  included = 'included',
  payment = 'payment',
  selectedForValidation = 'selected-for-validation',
  unusedVouchers = 'unused-vouchers',
  vouchersWithBalance = 'vouchers-with-balance',
  toCancelVouchers = 'to-cancel-vouchers',
  duplicates = 'duplicates',
}

export class ExportDetails {
  @ApiProperty({
    enum: ExportType,
    example: Object.values(ExportType).join(' | '),
  })
  public readonly type: ExportType;

  @ApiProperty()
  public readonly minPayment: number | null;

  @ApiProperty()
  public readonly maxPayment: number | null;
}
