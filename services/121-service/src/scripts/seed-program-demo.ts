import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import fspIntersolve from '../../seed-data/fsp/fsp-intersolve.json';
import instanceDemo from '../../seed-data/instance/instance-demo.json';
import programDemo from '../../seed-data/program/program-demo.json';
import { InterfaceScript } from './scripts.module';
import { SeedHelper } from './seed-helper';
import { SeedInit } from './seed-init';

@Injectable()
export class SeedDemoProgram implements InterfaceScript {
  public constructor(private dataSource: DataSource) {}

  private readonly seedHelper = new SeedHelper(this.dataSource);

  public async run(): Promise<void> {
    const seedInit = await new SeedInit(this.dataSource);
    await seedInit.run();

    // ***** CREATE FINANCIAL SERVICE PROVIDERS *****
    await this.seedHelper.addFsp(fspIntersolve);

    // ***** CREATE PROGRAM *****
    const program = await this.seedHelper.addProgram(programDemo);

    this.seedHelper.addDefaultUsers(program, true);

    // ***** CREATE INSTANCE *****
    await this.seedHelper.addInstance(instanceDemo);
  }
}

export default SeedDemoProgram;
