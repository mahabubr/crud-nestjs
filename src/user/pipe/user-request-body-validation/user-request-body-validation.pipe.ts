import {
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { RequestValidation } from 'src/utils/request-validation/request-validation';
import { Repository } from 'typeorm';

@Injectable()
export class UserRequestBodyValidationPipe implements PipeTransform {
  private request_validation: any;
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    this.request_validation = new RequestValidation(userRepository);
  }

  async transform(value: any) {
    const request_body_validation =
        await this.request_validation.validateRequestBody(value),
      all_error_message = { ...request_body_validation.error_message };

    if (Object.keys(all_error_message).length > 0) {
      throw new HttpException(all_error_message, HttpStatus.BAD_REQUEST);
    }

    return request_body_validation.value;
  }
}
