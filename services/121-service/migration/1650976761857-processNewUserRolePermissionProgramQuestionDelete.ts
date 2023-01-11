import { EntityManager, MigrationInterface, QueryRunner } from 'typeorm';
import { PermissionEnum } from '../src/user/permission.enum';
import { PermissionEntity } from '../src/user/permissions.entity';
import { UserRoleEntity } from '../src/user/user-role.entity';

export class processNewUserRolePermissionProgramQuestionDelete1650976761857
  implements MigrationInterface {
  name = 'processNewUserRolePermissionProgramQuestionDelete1650976761857';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    // 08-11-2022 migrateData() is commented out as this was causing issues with new entities and legacy migrations.
    // await this.migrateData(queryRunner.manager);
    // Start artifical transaction because typeorm migrations automatically tries to close a transcation after migration
    await queryRunner.startTransaction();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async migrateData(manager: EntityManager): Promise<void> {
    // Define new permissions
    const newPermissions = [PermissionEnum.ProgramQuestionDELETE];
    // Define closest permission to the new permission
    const closestPermission = PermissionEnum.ProgramQuestionUPDATE;

    // Add the new permission
    const permissionsRepository = manager.getRepository(PermissionEntity);
    for await (const newPermission of newPermissions) {
      const permission = new PermissionEntity();
      permission.name = newPermission;
      let permissionEntity = await permissionsRepository.findOne({
        where: { name: newPermission },
      });
      if (!permissionEntity) {
        permissionEntity = await permissionsRepository.save(permission);
      }

      // Loop over all existing roles, if it has the closes permission, also add the new permission
      const userRoleRepository = manager.getRepository(UserRoleEntity);
      const userRoles = await userRoleRepository.find({
        relations: ['permissions'],
      });
      for (const role of userRoles) {
        const permissions = role.permissions.map(p => p.name as PermissionEnum);
        if (
          permissions.includes(closestPermission) &&
          !permissions.includes(newPermission)
        ) {
          role.permissions.push(permissionEntity);
          await userRoleRepository.save(role);
        }
      }
    }
  }
}
