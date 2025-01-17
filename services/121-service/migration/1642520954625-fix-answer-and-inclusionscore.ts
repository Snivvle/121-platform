import { EntityManager, MigrationInterface, QueryRunner } from 'typeorm';
import { ProgramQuestionEntity } from '../src/programs/program-question.entity';
// import { ProgramAnswerEntity } from '../src/registration/program-answer.entity';
import { RegistrationEntity } from '../src/registration/registration.entity';

export class fixAnswerAndInclusionscore1642520954625
  implements MigrationInterface {
  public constructor(queryRunner: QueryRunner) {}

  name = 'fixAnswerAndInclusionscore1642520954625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // // Commit transaction because the tables are needed before the insert
    await queryRunner.commitTransaction();
    await this.migrateData(queryRunner.manager);
    // // Start artifical transaction because typeorm migrations automatically tries to close a transcation after migration
    await queryRunner.startTransaction();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async migrateData(manager: EntityManager): Promise<void> {
    const registrationRepository = manager.getRepository(RegistrationEntity);
    const programQuestionRepository = manager.getRepository(
      ProgramQuestionEntity,
    );

    // COMMENTED OUT THIS PART
    // Because we removed answer entity, the 121-service will not compile with this part
    // And we will nexver need this part of the migration again

    // const programAnswerRepository = manager.getRepository(
    //   ProgramAnswerEntity,
    // );
    // const registrations = await registrationRepository.find();
    // for (const registration of registrations) {
    //   const customDataObject = Object.assign(registration.customData);

    //   for await (const key of Object.keys(customDataObject)) {
    //     const programQuestion = await programQuestionRepository.findOne({
    //       where: { name: key },
    //     });
    //     if (programQuestion) {
    //       const oldAnswer = await programAnswerRepository.findOne({
    //         where: {
    //           registration: { id: registration.id },
    //           programQuestion: { id: programQuestion.id },
    //         },
    //       });
    //       if (oldAnswer) {
    //         oldAnswer.programAnswer = customDataObject[key];
    //         await programAnswerRepository.save(oldAnswer);
    //       }
    //     }
    //   }
    // }
  }
}
