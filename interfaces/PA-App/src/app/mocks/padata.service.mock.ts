import { of } from 'rxjs';
import { PaDataTypes } from '../services/padata-types.enum';
import { mockProgram } from './api.program.mock';

export const MockPaDataService = {
  type: PaDataTypes,
  myPrograms: {},
  authenticationState$: of(null),
  getUsername: () => Promise.resolve(''),
  setCurrentProgramId: () => {},
  getCurrentProgramId: () => Promise.resolve(mockProgram.id),
  getCurrentProgram: () => Promise.resolve(mockProgram),
  getAllPrograms: () => Promise.resolve([mockProgram]),
  saveAnswers: () => Promise.resolve(''),
  store: () => Promise.resolve(''),
  retrieve: () => Promise.resolve(''),
  createAccount: () => Promise.resolve(''),
  login: () => Promise.resolve(''),
  logout: () => {},
  setReferenceId: () => Promise.resolve(''),
  deleteAccount: () => Promise.resolve(''),
};
