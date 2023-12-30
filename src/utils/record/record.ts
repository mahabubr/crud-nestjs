/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import {
  Repository,
  Not,
  Like,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Equal,
  Between,
  In,
  Any,
  IsNull,
  ArrayContains,
  ArrayContainedBy,
  ArrayOverlap,
} from 'typeorm';
import { plainToClass } from 'class-transformer';

export class Record {
  private repository: any;
  private table_serializer: any;
  private details_serializer: any;
  private privet_table_serializer: any;
  private privet_details_serializer: any;
  private queryBuilder: any;
  private auth_data = {
    host: null,
    user_info: {},
    token: null,
    group: null,
    url_name: null,
    given_uuid: null,
  };
  private queryFunc = {
    Not: Not,
    Like: Like,
    LessThan: LessThan,
    LessThanOrEqual: LessThanOrEqual,
    MoreThan: MoreThan,
    MoreThanOrEqual: MoreThanOrEqual,
    Equal: Equal,
    Between: Between,
    In: In,
    Any: Any,
    IsNull: IsNull,
    ArrayContains: ArrayContains,
    ArrayContainedBy: ArrayContainedBy,
    ArrayOverlap: ArrayOverlap,
  };

  constructor(
    repository: any,
    table_serializer: any,
    details_serializer: any,
    privet_table_serializer = null,
    privet_details_serializer = null,
    queryBuilder = null,
  ) {
    this.repository = repository;
    this.table_serializer = table_serializer;
    this.details_serializer = details_serializer;
    this.privet_table_serializer = privet_table_serializer ?? table_serializer;
    this.privet_details_serializer =
      privet_details_serializer ?? details_serializer;
    this.queryBuilder = queryBuilder;
    this.auth_data = {
      host: null,
      user_info: {},
      token: null,
      group: null,
      url_name: null,
      given_uuid: null,
    };
  }

  extractFunctionInfo(jsString: any) {
    if (typeof jsString === 'string') {
      const regex = /fnc\s*([^(]*)\([^)]*\)/;
      const matches = jsString.match(regex);

      if (matches && matches.length >= 2) {
        const functionName = matches[1].trim();
        const parameters = matches[0]
          .match(/\([^)]*\)/)[0]
          .slice(1, -1)
          .trim();

        return {
          functionName,
          parameters,
        };
      }
    }

    return null; // No function found or invalid syntax
  }

  removeExtraData(data: object) {
    for (const [key, value] of Object.entries(this.auth_data)) {
      if (key in data) {
        this.auth_data[key] = data[key];
        delete data[key];
      }
    }

    if (data['query']) {
      data['query'] = this.refineQueryData(data['query']);
    }

    return data;
  }

  refineQueryData(data: any) {
    let query_data = data;
    for (const [key, value] of Object.entries(query_data)) {
      let functionData = this.extractFunctionInfo(value);
      query_data[key] =
        functionData != null
          ? this.queryFunc[functionData.functionName](functionData.parameters)
          : typeof value === 'object'
            ? this.refineQueryData(value)
            : value;
    }
    return data;
  }

  async store(data: object) {
    let record = new this.details_serializer(data);
    let new_record = this.repository.create(record);
    await this.repository.save(new_record);
    return new_record;
  }

  async list(
    requestBody: any,
    relations: any = {},
    is_private: boolean = false,
    custom_data: any = null,
    order_by: any = requestBody['order_by'] ?? { created_at: 'ASC' },
  ) {
    requestBody = this.removeExtraData(requestBody);

    let serializer = is_private
        ? this.privet_table_serializer
        : this.table_serializer,
      query = {
        ...(requestBody?.query
          ? { where: { ...requestBody.query } }
          : { where: {} }),
      },
      total_number_of_record = await this.repository
        .find(query)
        .then((res) => res.length),
      skip_amount = requestBody.limit * (requestBody.page - 1),
      total_page = total_number_of_record / requestBody.limit,
      findOptions = {
        relations,
        ...query,
        skip: skip_amount,
        take: requestBody.limit,
        order: order_by,
      },
      data = this.queryBuilder
        ? await this.queryBuilder.setFindOptions(findOptions).getMany()
        : (await custom_data) ?? (await this.repository.find(findOptions)),
      serialized_data = plainToClass(serializer, data, {
        groups: [this.auth_data.group],
      });

    return {
      data: await serialized_data,
      limit: requestBody.limit,
      page: requestBody.page,
      total_page: Math.ceil(total_page),
    };
  }

  async archive(
    requestBody: any,
    relations: any = {},
    is_private: boolean = false,
    custom_data: any = null,
  ) {
    requestBody = this.removeExtraData(requestBody);
    let serializer = is_private
        ? this.privet_table_serializer
        : this.table_serializer,
      query = {
        ...(requestBody?.query
          ? { where: { ...requestBody.query, deleted: true } }
          : { where: { deleted: true } }),
      },
      total_number_of_record = await this.repository
        .find(query)
        .then((res) => res.length),
      skip_amount = requestBody.limit * (requestBody.page - 1),
      total_page = total_number_of_record / requestBody.limit,
      data =
        custom_data == null
          ? this.repository.find({
              relations,
              ...query,
              skip: skip_amount,
              take: requestBody.limit,
            })
          : custom_data,
      serialized_data = plainToClass(serializer, data);

    return {
      data: await serialized_data,
      limit: requestBody.limit,
      page: requestBody.page,
      total_page: Math.ceil(total_page),
    };
  }

  async details(
    query: object,
    request: any = {},
    relations: any = {},
    is_private: boolean = false,
  ) {
    if (Object.keys(request).length > 0) this.removeExtraData(request);
    let serializer = is_private
        ? this.privet_details_serializer
        : this.details_serializer,
      findOptions = { relations, where: { ...query } },
      data = this.queryBuilder
        ? await this.queryBuilder.setFindOptions(findOptions).getOne()
        : await this.repository.findOne(findOptions),
      serialized_data = plainToClass(serializer, data, {
        groups: [this.auth_data.group],
      });
    return serialized_data;
  }

  async update(query: object, data: object, return_obj = false) {
    try {
      let record = await this.repository.findOne({
        where: query,
        loadRelationIds: true,
      });
      for (const key in data) {
        record[key] = data[key];
      }
      await this.repository.save(record);
      return return_obj ? record : 'successfull';
    } catch (err) {
      console.error(err);
      return 'failed';
    }
  }

  remove(query: object) {
    try {
      // 2023-05-24 01:05:15.171512
      this.repository.delete(query);
      return 'successfull';
    } catch (err) {
      return 'failed';
    }
  }

  restore(query: object) {
    try {
      this.repository.update(query, { deleted: false });
      return 'successfull';
    } catch (err) {
      return 'failed';
    }
  }

  erase(query: object) {
    try {
      this.repository.delete({ ...query, deleted: true });
      return 'successfull';
    } catch (err) {
      return 'failed';
    }
  }
}
