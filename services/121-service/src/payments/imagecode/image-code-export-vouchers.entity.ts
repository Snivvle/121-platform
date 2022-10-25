import { Column, Entity, ManyToOne } from 'typeorm';
import { Base121Entity } from '../../base.entity';
import { RegistrationEntity } from '../../registration/registration.entity';
import { IntersolveBarcodeEntity } from '../fsp-integration/intersolve/intersolve-barcode.entity';

@Entity('imagecode_export_vouchers')
export class ImageCodeExportVouchersEntity extends Base121Entity {
  @Column({ type: 'bytea' })
  public image: any;

  @ManyToOne(
    _type => RegistrationEntity,
    registration => registration.images,
  )
  public registration: RegistrationEntity;

  @ManyToOne(
    _type => IntersolveBarcodeEntity,
    barcode => barcode.image,
  )
  public barcode: IntersolveBarcodeEntity;
}
