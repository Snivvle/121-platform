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
  postalIndex = 'postalIndex',
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
}

export class Attribute {
  public attribute: string;
  public type: string;
}

export enum AnswerTypes {
  tel = 'tel',
  dropdown = 'dropdown',
  numeric = 'numeric',
  text = 'text',
  date = 'date',
}
