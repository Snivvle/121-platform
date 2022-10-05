import { SeedTestProgram } from './seed-program-test';
import { SeedProgramDrc } from './seed-program-drc';
import { SeedProgramLbn } from './seed-program-lbn';
import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Connection } from 'typeorm';
import { SeedProgramValidation } from './seed-program-validation';
import { SeedDemoProgram } from './seed-program-demo';
import { SeedTestMultipleProgram } from './seed-program-test-multiple';
import { SeedPilotNLProgram } from './seed-program-pilot-nl';
import { SeedPilotNL2Program } from './seed-program-pilot-nl-2';
import SeedProgramEth from './seed-program-eth';
import SeedProgramUkr from './seed-program-ukr';

enum SeedScript {
  pilotNL = 'pilot-nl',
  pilotNLPV = 'pilot-nl-pv',
  pilotETH = 'pilot-eth',
  pilotLBN = 'pilot-lbn',
  pilotUKR = 'pilot-ukr',
  DRC = 'drc',
  demo = 'demo',
  test = 'test',
  testMultiple = 'test-multiple',
  validation = 'validation',
}

class ResetDto {
  @ApiProperty({ example: 'fill_in_secret' })
  @IsNotEmpty()
  @IsString()
  public readonly secret: string;
  @ApiProperty({
    enum: SeedScript,
    example: Object.values(SeedScript).join(' | '),
  })
  public readonly script: string;
}

@Controller('scripts')
export class ScriptsController {
  public constructor(private connection: Connection) {}

  @ApiOperation({ summary: 'Reset database' })
  @Post('/reset')
  public async resetDb(@Body() body: ResetDto, @Res() res): Promise<string> {
    if (body.secret !== process.env.RESET_SECRET) {
      return res.status(HttpStatus.FORBIDDEN).send('Not allowed');
    }
    let seed;
    if (body.script == SeedScript.demo) {
      seed = new SeedDemoProgram(this.connection);
    } else if (body.script == SeedScript.test) {
      seed = new SeedTestProgram(this.connection);
    } else if (body.script == SeedScript.testMultiple) {
      seed = new SeedTestMultipleProgram(this.connection);
    } else if (body.script == SeedScript.pilotNL) {
      seed = new SeedPilotNLProgram(this.connection);
    } else if (body.script == SeedScript.pilotNLPV) {
      seed = new SeedPilotNL2Program(this.connection);
    } else if (body.script == SeedScript.pilotETH) {
      seed = new SeedProgramEth(this.connection);
    } else if (body.script == SeedScript.pilotLBN) {
      seed = new SeedProgramLbn(this.connection);
    } else if (body.script == SeedScript.pilotUKR) {
      seed = new SeedProgramUkr(this.connection);
    } else if (body.script == SeedScript.DRC) {
      seed = new SeedProgramDrc(this.connection);
    } else {
      seed = new SeedProgramValidation(this.connection);
    }
    await seed.run();
    return res
      .status(HttpStatus.ACCEPTED)
      .send('Request received. The reset can take a minute.');
  }
}
