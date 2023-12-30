import {
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Validator } from 'src/utils/request-validation/request-validation';
import { Repository } from 'typeorm';

@Injectable()
export class CreateUserValidationPipeLine
  extends Validator
  implements PipeTransform
{
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    super();
    this.repository = userRepository;
    this.condition = {
      name: { list: ['string', 'length|250'], message: {} },
      email: { list: ['email', 'unique', 'length|250'], message: {} },
      password: { list: ['string'], message: {} },
    };
  }

  async transform(value: any) {
    this.given_values = value;
    this.unique_record_query = {
      email: {
        email: this.given_values?.email,
      },
    };

    const data = await this.validatedData()
      .then((res: any) => res)
      .catch((err: any) => {
        throw new HttpException(err, HttpStatus.BAD_REQUEST);
      });

    return data;
  }
}
