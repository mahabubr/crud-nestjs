import { Injectable } from '@nestjs/common';
import { Record } from 'src/utils/record/record';
import { userRelations } from 'src/utils/relations';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserListSerializer, UserSerializer } from './user.serializer';
import { UserRequestBodyDto } from './dto/user-request-body-dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private record: Record;
  private relations = userRelations;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    this.record = new Record(
      this.userRepository,
      UserListSerializer,
      UserSerializer,
    );
  }

  create_user(createUserDto: CreateUserDto) {
    return this.record.store(createUserDto);
  }

  get_user(request: UserRequestBodyDto, is_private = false) {
    return this.record.list(request, this.relations, is_private);
  }

  get_single_user(_id: string, request: any, is_private = false) {
    return this.record.details({ _id }, request, this.relations, is_private);
  }

  update_user(_id: string, updateUserDto: UpdateUserDto) {
    return this.record.update({ _id }, updateUserDto);
  }

  delete_user(_id: string) {
    return this.record.remove({ _id });
  }
}
