import { PermissionsGuard } from './../permissions.guard';
import { PermissionEnum } from './permission.enum';
import { UserEntity } from './user.entity';
import { CreateUserPersonAffectedDto } from './dto/create-user-person-affected.dto';
import { CreateUserAidWorkerDto } from './dto/create-user-aid-worker.dto';
import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  UseGuards,
  Res,
  Req,
  Put,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserRO } from './user.interface';
import { LoginUserDto, UpdateUserDto } from './dto';
import { User } from './user.decorator';

import { ApiUseTags, ApiOperation, ApiImplicitParam } from '@nestjs/swagger';
import { AssignAidworkerToProgramDto } from './dto/assign-aw-to-program.dto';
import { UserRoleEntity } from './user-role.entity';
import { Permissions } from '../permissions.decorator';
import { CreateUserRoleDto, UpdateUserRoleDto } from './dto/user-role.dto';
import { CookieNames } from '../shared/enum/cookie.enums';

@UseGuards(PermissionsGuard)
@ApiUseTags('user')
@Controller()
export class UserController {
  private readonly userService: UserService;
  public constructor(userService: UserService) {
    this.userService = userService;
  }

  @Permissions(PermissionEnum.RoleREAD)
  @ApiOperation({ title: 'Get all user roles' })
  @Get('roles')
  public async getUserRoles(): Promise<UserRoleEntity[]> {
    return await this.userService.getUserRoles();
  }

  @Permissions(PermissionEnum.RoleCREATE)
  @ApiOperation({ title: 'Create new user role' })
  @Post('roles')
  public async addUserRole(
    @Body() userRoleData: CreateUserRoleDto,
  ): Promise<UserRoleEntity> {
    return await this.userService.addUserRole(userRoleData);
  }

  @Permissions(PermissionEnum.RoleUPDATE)
  @ApiOperation({ title: 'Update existing user role' })
  @ApiImplicitParam({ name: 'userRoleId', required: true, type: 'integer' })
  @Put('roles/:userRoleId')
  public async updateUserRole(
    @Param() params,
    @Body() userRoleData: UpdateUserRoleDto,
  ): Promise<UserRoleEntity> {
    return await this.userService.updateUserRole(
      params.userRoleId,
      userRoleData,
    );
  }

  @Permissions(PermissionEnum.RoleDELETE)
  @ApiOperation({ title: 'Delete existing user role' })
  @ApiImplicitParam({ name: 'userRoleId', required: true, type: 'integer' })
  @Delete('roles/:userRoleId')
  public async deleteUserRole(@Param() params): Promise<UserRoleEntity> {
    return await this.userService.deleteUserRole(params.userRoleId);
  }

  @Permissions(PermissionEnum.AidWorkerCREATE)
  @ApiOperation({ title: 'Sign-up new Aid Worker user' })
  @Post('user/aidworker')
  public async createAw(
    @Body() userData: CreateUserAidWorkerDto,
  ): Promise<UserRO> {
    return this.userService.createAidWorker(userData);
  }

  @ApiOperation({ title: 'Sign-up new Person Affected user' })
  @Post('user/person-affected')
  public async createPA(
    @Body() userData: CreateUserPersonAffectedDto,
    @Res() res,
    @Req() req,
  ): Promise<UserRO> {
    let sameSite;
    let secure;
    if (process.env.NODE_ENV === 'production') {
      sameSite = 'None';
      secure = 'Lax';
    } else {
      const origin = req.get('origin');
      const serviceWorkerDebug = origin.includes('8088');
      sameSite = serviceWorkerDebug ? 'None' : 'Lax';
      secure = serviceWorkerDebug;
    }

    try {
      const user = await this.userService.createPersonAffected(userData);
      const exp = new Date(Date.now() + 60 * 24 * 3600000);
      res.cookie(CookieNames.paApp, user.user.token, {
        sameSite: sameSite,
        secure: secure,
        expires: exp,
        httpOnly: true,
      });
      return res.send({
        username: user.user.username,
        permissions: user.user.permissions,
        expires: exp,
      });
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ title: 'Log in existing user' })
  @Post('user/login')
  public async login(
    @Body() loginUserDto: LoginUserDto,
    @Res() res,
    @Req() req,
  ): Promise<UserRO> {
    try {
      const loginResponse = await this.userService.login(loginUserDto);
      const origin = req.get('origin');
      const serviceWorkerDebug = origin.includes('8088');

      res.cookie(
        loginResponse.cookieSettings.tokenKey,
        loginResponse.cookieSettings.tokenValue,
        {
          sameSite: serviceWorkerDebug
            ? 'None'
            : loginResponse.cookieSettings.sameSite,
          secure: serviceWorkerDebug
            ? true
            : loginResponse.cookieSettings.secure,
          expires: loginResponse.cookieSettings.expires,
          httpOnly: loginResponse.cookieSettings.httpOnly,
        },
      );
      return res.send({
        username: loginResponse.userRo.user.username,
        permissions: loginResponse.userRo.user.permissions,
        expires: loginResponse.cookieSettings.expires,
      });
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ title: 'Log out existing user' })
  @Post('user/logout')
  public async logout(@Res() res): Promise<UserRO> {
    try {
      const key = this.userService.getInterfaceKeyByHeader();
      res.cookie(key, '', {
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(Date.now() - 60 * 24 * 3600000),
        httpOnly: true,
      });
      return res.send();
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ title: 'Change password of logged in user' })
  @Post('user/change-password')
  public async update(
    @User('id') userId: number,
    @Body() userData: UpdateUserDto,
  ): Promise<any> {
    return this.userService.update(userId, userData);
  }

  @Permissions(PermissionEnum.AidWorkerDELETE)
  @ApiOperation({ title: 'Delete user by userId' })
  @Post('user/delete/:userId')
  @ApiImplicitParam({ name: 'userId', required: true, type: 'integer' })
  public async delete(@Param() params): Promise<UserEntity> {
    return await this.userService.delete(Number(params.userId));
  }

  @ApiOperation({ title: 'User deletes itself' })
  @Post('user/delete')
  public async deleteCurrentUser(
    @User('id') deleterId: number,
  ): Promise<UserEntity> {
    return await this.userService.delete(deleterId);
  }

  @ApiOperation({ title: 'Get current user' })
  @Get('user')
  public async findMe(@User('username') username: string): Promise<UserRO> {
    return await this.userService.findByUsername(username);
  }

  @Permissions(PermissionEnum.AidWorkerProgramUPDATE)
  @ApiOperation({ title: 'Assign Aidworker to program' })
  @Post('user/assign-to-program')
  public async assignFieldValidationAidworkerToProgram(
    @Body() assignAidworkerToProgram: AssignAidworkerToProgramDto,
  ): Promise<UserRoleEntity[]> {
    return await this.userService.assigAidworkerToProgram(
      assignAidworkerToProgram,
    );
  }
}
