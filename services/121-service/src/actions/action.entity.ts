import { ExportType } from '../export-metrics/dto/export-details';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { ProgramEntity } from '../programs/program.entity';
import { Base121Entity } from '../base.entity';

@Entity('action')
export class ActionEntity extends Base121Entity {
  @Column()
  public actionType: ActionType;

  @ManyToOne(
    type => UserEntity,
    user => user.actions,
  )
  public user: UserEntity;

  @ManyToOne(
    type => ProgramEntity,
    program => program.actions,
  )
  public program: ProgramEntity;
}

export enum AdditionalActionType {
  importPeopleAffected = 'import-people-affected',
  importRegistrations = 'import-registrations',
  paymentFinished = 'payment-finished',
  paymentStarted = 'payment-started',
  exportFspInstructions = 'export-fsp-instructions',
}
export type ActionType = ExportType | AdditionalActionType;

// Add both enum together to one array so it can be used as validator in the dto
const ExportActionArray = Object.values(ExportType).map(item => String(item));
const AdditionalActionArray = Object.values(AdditionalActionType).map(item =>
  String(item),
);
export const ActionArray = ExportActionArray.concat(AdditionalActionArray);
