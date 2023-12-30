import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserValidationPipeLine } from './pipe/create-user-validation/create-user-validation.pipe';
import { UserRequestBodyValidationPipe } from './pipe/user-request-body-validation/user-request-body-validation.pipe';
import { UserRequestBodyDto } from './dto/user-request-body-dto';
import { UpdateUserValidationPipe } from './pipe/update-user-validation/update-user-validation.pipe';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('')
  create_user(
    @Body(CreateUserValidationPipeLine) createUserDto: CreateUserDto,
  ) {
    return this.userService.create_user(createUserDto);
  }

  @Post('list')
  get_all(@Body(UserRequestBodyValidationPipe) request: UserRequestBodyDto) {
    return this.userService.get_user(request);
  }

  @Post('list/:id')
  get_single(@Body() request: any, @Param('id') _id: string) {
    return this.userService.get_single_user(_id, request);
  }

  @Patch(':id')
  update_user(
    @Param('id') _id: string,
    @Body(UpdateUserValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update_user(_id, updateUserDto);
  }

  @Delete(':id')
  delete_user(@Param('id') _id: string) {
    return this.userService.delete_user(_id);
  }
}
