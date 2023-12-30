import { Exclude } from 'class-transformer';

export class UserSerializer {
  @Exclude() id: number;
  // @Exclude() name: string;
  // @Exclude() email: string;
  // @Exclude() password: string;
  // @Exclude() created_at: Date;
  // @Exclude() updated_at: Date;

  constructor(partial: Partial<UserSerializer[]>) {
    Object.assign(this, partial);
  }
}

export class UserListSerializer {
  @Exclude() id: number;
  // @Exclude() name: string;
  // @Exclude() email: string;
  // @Exclude() password: string;
  // @Exclude() created_at: Date;
  // @Exclude() updated_at: Date;

  constructor(partial: Partial<UserListSerializer[]>) {
    Object.assign(this, partial);
  }
}
