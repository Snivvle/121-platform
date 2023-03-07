export enum CustomDataAttributes {
  phoneNumber = 'phoneNumber',
  whatsappPhoneNumber = 'whatsappPhoneNumber',
  name = 'name',
  nameFirst = 'nameFirst',
  nameLast = 'nameLast',
  firstName = 'firstName',
  secondName = 'secondName',
  thirdName = 'thirdName',
  lastName = 'lastName',
  fathersName = 'fathersName',
  namePartnerOrganization = 'namePartnerOrganization',
  businessPlanDelivered = 'businessPlanDelivered',
  completedTraining = 'completedTraining',
  milestone1 = 'milestone1',
  milestone2 = 'milestone2',
  address = 'address',
  addressNoPostalIndex = 'addressNoPostalIndex',
  oblast = 'oblast',
  raion = 'raion',
  postalIndex = 'postalIndex',
  city = 'city',
  street = 'street',
  house = 'house',
  apartmentOrOffice = 'apartmentOrOffice',
  taxId = 'taxId',
  transferCosts = 'transferCosts',
  transferTrackNr = 'transferTrackNr',
  householdCount = 'householdCount',
}

export enum GenericAttributes {
  phoneNumber = 'phoneNumber',
  preferredLanguage = 'preferredLanguage',
  fspName = 'fspName',
  paymentAmountMultiplier = 'paymentAmountMultiplier',
  maxPayments = 'maxPayments',
  referenceId = 'referenceId',
}

export class Attribute {
  public name: string;
  public type: string;
  public label: object;
  public shortLabel?: object;
  public options?: JSON;
}

export enum AnswerTypes {
  tel = 'tel',
  dropdown = 'dropdown',
  numeric = 'numeric',
  numericNullable = 'numeric-nullable',
  text = 'text',
  date = 'date',
  multiSelect = 'multi-select',
}

export enum CustomAttributeType {
  boolean = 'boolean',
  text = 'text',
}

export type AttributeType = AnswerTypes | CustomAttributeType;
export const AttributeType = { ...AnswerTypes, ...CustomAttributeType };
