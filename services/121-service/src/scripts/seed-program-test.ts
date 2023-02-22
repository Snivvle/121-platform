import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import fspAfricasTalking from '../../seed-data/fsp/fsp-africas-talking.json';
import fspBank from '../../seed-data/fsp/fsp-bank.json';
import fspIntersolve from '../../seed-data/fsp/fsp-intersolve-voucher-whatsapp.json';
import fspMixedAttributes from '../../seed-data/fsp/fsp-mixed-attributes.json';
import fspNoAttributes from '../../seed-data/fsp/fsp-no-attributes.json';
import fspVodaCash from '../../seed-data/fsp/fsp-vodacash.json';
import instanceDemo from '../../seed-data/instance/instance-demo.json';
import programTest from '../../seed-data/program/program-test.json';
import { InterfaceScript } from './scripts.module';
import { SeedHelper } from './seed-helper';
import { SeedInit } from './seed-init';

@Injectable()
export class SeedTestProgram implements InterfaceScript {
  public constructor(private dataSource: DataSource) {}

  private readonly seedHelper = new SeedHelper(this.dataSource);

  public async run(): Promise<void> {
    const seedInit = await new SeedInit(this.dataSource);
    await seedInit.run();

    // ***** CREATE FINANCIAL SERVICE PROVIDERS *****
    await this.seedHelper.addFsp(fspIntersolve);
    await this.seedHelper.addFsp(fspAfricasTalking);
    await this.seedHelper.addFsp(fspBank);
    await this.seedHelper.addFsp(fspMixedAttributes);
    await this.seedHelper.addFsp(fspNoAttributes);
    await this.seedHelper.addFsp(fspVodaCash);

    // ***** CREATE PROGRAM *****
    const program = await this.seedHelper.addProgram(programTest);

    this.seedHelper.addDefaultUsers(program, true);

    // ***** CREATE INSTANCE *****
    await this.seedHelper.addInstance(instanceDemo);
  }
}

export default SeedTestProgram;
