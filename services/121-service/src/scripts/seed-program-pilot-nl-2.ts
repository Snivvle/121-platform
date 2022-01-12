import { Injectable } from '@nestjs/common';
import { InterfaceScript } from './scripts.module';
import { Connection } from 'typeorm';

import { SeedHelper } from './seed-helper';
import { SeedInit } from './seed-init';

import fspIntersolve from '../../seed-data/fsp/fsp-intersolve.json';
import fspIntersolveNoWhatsapp from '../../seed-data/fsp/fsp-intersolve-no-whatsapp.json';

import programPilotNL2 from '../../seed-data/program/program-pilot-nl-2.json';
import instancePilotNL2 from '../../seed-data/instance/instance-pilot-nl-2.json';
import { DefaultUserRole } from '../user/user-role.enum';

@Injectable()
export class SeedPilotNL2Program implements InterfaceScript {
  public constructor(private connection: Connection) {}

  private readonly seedHelper = new SeedHelper(this.connection);

  public async run(): Promise<void> {
    const seedInit = await new SeedInit(this.connection);
    await seedInit.run();

    // ***** CREATE FINANCIAL SERVICE PROVIDERS *****
    await this.seedHelper.addFsp(fspIntersolve);
    await this.seedHelper.addFsp(fspIntersolveNoWhatsapp);

    // ***** CREATE PROGRAM *****
    const program = await this.seedHelper.addProgram(programPilotNL2);

    // ***** ASSIGN AIDWORKER TO PROGRAM WITH ROLES *****
    this.seedHelper.addDefaultUsers(program, false);
    await this.seedHelper.assignAdminUserToProgram(program.id);

    // ***** CREATE INSTANCE *****
    await this.seedHelper.addInstance(instancePilotNL2);
  }
}

export default SeedPilotNL2Program;
