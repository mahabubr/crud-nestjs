/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */
import { EntityManager, Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common/enums';
import { HttpException } from '@nestjs/common/exceptions';
import * as bcrypt from 'bcrypt';

export class RequestValidation {
  private repository: any;
  private error_message: {};
  private validation_condition: {};

  constructor(repository: any) {
    this.repository = repository;
  }

  async validateRequestBody(value: any) {
    let total_number_of_record = await this.repository.count(),
      has_limit = value?.limit,
      limit_error_message = [
        ...(!has_limit ? ['please enter limit in "limit" field'] : []),
      ],
      has_page = value?.page,
      page_error_message = [
        ...(!has_page ? ['please enter page number in "page" field'] : []),
      ],
      error_message = {
        ...(page_error_message.length > 0 ? { page: page_error_message } : {}),
        ...(limit_error_message.length > 0
          ? { limit: limit_error_message }
          : {}),
      };
    if (value.page && value.limit) {
      if (value.page > Math.ceil(total_number_of_record / value.limit)) {
        value.page = 1;
      }
    }
    return { error_message, value };
  }
}

export class Validator {
  protected repository: any;
  protected error_messages = {};
  protected unique_record_query = {};
  protected unique_record_filer = {};
  protected existence_check = {};
  protected condition: any;
  protected given_values: any;
  protected given_uuid: string;

  protected validation_method = {
    required: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let has = this.exist(field),
          error_message = '';
        if (!has) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} is required`;
          reject(error_message);
        }
        resolve({
          valide: has,
          message: error_message,
        });
      });
    },
    required_if: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let new_check_if = check_if.splice(1, 1);
        for (let check of new_check_if) {
          let check_field = check.replace('!', ''),
            condition = check.includes('!')
              ? !this.exist(check_field)
              : this.exist(check_field),
            has = condition ? this.exist(field) : true,
            error_message = '';

          if (!has) {
            error_message = message
              ? message
              : `${field.replace('_', ' ')} is required`;
            reject(error_message);
          }
        }
        resolve({
          valide: true,
          message: 'error_message',
        });
      });
    },
    length: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        if (!check_if[1])
          throw new HttpException(
            'provide length limit',
            HttpStatus.BAD_REQUEST,
          );

        let max_langth =
            this.exist(field) && this.isString(this.given_values[field])
              ? this.given_values[field]?.length > check_if[1]
              : false,
          error_message = '';
        if (max_langth) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} length must be under ${check_if[1]}`;
          reject(error_message);
        }

        resolve({
          valide: !max_langth,
          message: error_message,
        });
      });
    },
    max: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        if (!check_if[1])
          throw new HttpException('provide max limit', HttpStatus.BAD_REQUEST);

        let max =
            this.exist(field) && this.isInt(this.given_values[field])
              ? this.given_values[field] > check_if[1]
              : false,
          error_message = '';
        if (max) {
          error_message = message
            ? message
            : `maximum ${field.replace('_', ' ')} is ${check_if[1]}`;
          reject(error_message);
        }

        resolve({
          valide: !max,
          message: error_message,
        });
      });
    },
    min: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        if (!check_if[1])
          throw new HttpException('provide min limit', HttpStatus.BAD_REQUEST);

        let min =
            this.exist(field) && this.isInt(this.given_values[field])
              ? this.given_values[field] < check_if[1]
              : false,
          error_message = '';
        if (min) {
          error_message = message
            ? message
            : `minimum ${field.replace('_', ' ')} is ${check_if[1]}`;
          reject(error_message);
        }

        resolve({
          valide: !min,
          message: error_message,
        });
      });
    },
    unique: async (field: string, check_if: string[], message: string) => {
      if (!check_if[1] && !this.unique_record_query[field])
        throw new HttpException(
          'provide field or set query',
          HttpStatus.BAD_REQUEST,
        );

      return new Promise(async (resolve, reject) => {
        let query = {};
        if (check_if[1]) {
          query[check_if[1]] = this.exist(field)
            ? this.given_values[field]
            : '';
        }
        if (!check_if[1] && this.unique_record_query[field]) {
          query = { ...this.unique_record_query[field] };
        }

        let found = this.exist(field)
            ? await this.repository
                .find({ where: query })
                .then((result: any) => {
                  let is_found = !this.unique_record_filer[field]
                    ? result.length > 0
                    : result.filter(this.unique_record_filer[field]).length > 0;
                  return is_found;
                })
            : false,
          error_message = '';

        if (found) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} already exist`;
          reject(error_message);
        }

        resolve({
          valide: !found,
          message: error_message,
        });
      });
    },
    number: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let isNumber = this.exist(field)
            ? this.isInt(this.given_values[field])
            : true,
          error_message = '';
        if (!isNumber) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must be a number`;
          reject(error_message);
        }
        resolve({
          valide: isNumber,
          message: error_message,
        });
      });
    },
    string: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let isString = this.exist(field)
            ? this.isString(this.given_values[field])
            : true,
          error_message = '';
        if (!isString) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must be a string`;
          reject(error_message);
        }
        resolve({
          valide: isString,
          message: error_message,
        });
      });
    },
    enum: async (field: string, check_if: string[], message: string) => {
      if (!check_if[1])
        throw new HttpException('provide enum values', HttpStatus.BAD_REQUEST);

      return new Promise((resolve, reject) => {
        let inEnum = this.exist(field)
            ? check_if[1].split(',').includes(this.given_values[field])
            : true,
          error_message = '';

        if (!inEnum) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must in given formet`;
          reject(error_message);
        }

        resolve({
          valide: inEnum,
          message: error_message,
        });
      });
    },
    array: async (field: string, check_if: string[], message: string) => {
      return new Promise(async (resolve, reject) => {
        let isArray = this.exist(field)
            ? Array.isArray(this.given_values[field])
            : true,
          error_message = '',
          isValueType = true;
        if (Array.isArray(this.given_values[field]) && this.exist(field)) {
          for (const fieldValue of this.given_values[field]) {
            isValueType =
              this.exist(field) && check_if[1] && isArray
                ? check_if[1] != 'uuid'
                  ? !check_if[1].includes('search_by_')
                    ? typeof fieldValue != check_if[1]
                    : await this.isUuidExist(
                        field,
                        fieldValue,
                        null,
                        check_if[1].replace('search_by_', ''),
                      )
                  : this.isUuid(fieldValue) &&
                    (await this.isUuidExist(field, fieldValue))
                : true;

            if (!isValueType) {
              break;
            }
          }
        }

        if (!isArray) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must be an array`;
          reject(error_message);
        }

        if (!isValueType) {
          error_message = message
            ? message
            : `${field.replace(
                '_',
                ' ',
              )} must be an array of valid ${check_if[1].replace(
                'search_by_',
                '',
              )}`;
          reject(error_message);
        }
        resolve({
          valide: isArray,
          message: error_message,
        });
      });
    },
    uuid: async (field: string, check_if: string[], message: string) => {
      return new Promise(async (resolve, reject) => {
        let isUuid = this.exist(field)
            ? this.isUuid(this.given_values[field])
            : true,
          exist =
            this.exist(field) && check_if[1] && isUuid
              ? await this.isUuidExist(field, this.given_values[field])
              : true,
          error_message = '';

        if (!isUuid) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must be an unique user id`;
          reject(error_message);
        }

        if (!exist) {
          error_message = message
            ? message
            : `invalide ${field.replace('_', ' ')}`;
          reject(error_message);
        }
        resolve({
          valide: isUuid,
          message: error_message,
        });
      });
    },
    email: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let isEmail =
            this.exist(field) && this.isString(this.given_values[field])
              ? this.isEmailValide(this.given_values[field])
              : true,
          error_message = '';
        if (!isEmail) {
          error_message = message
            ? message
            : `enter a valide ${field.replace('_', ' ')}`;
          reject(error_message);
        }
        resolve({
          valide: isEmail,
          message: error_message,
        });
      });
    },
    boolean: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let isboolean = this.exist(field)
            ? typeof this.given_values[field] == 'boolean'
            : true,
          error_message = '';

        if (!isboolean) {
          error_message = message
            ? message
            : `${field.replace('_', ' ')} must be an boolean`;
          reject(error_message);
        }
        resolve({
          valide: isboolean,
          message: error_message,
        });
      });
    },
    confirm: async (field: string, check_if: string[], message: string) => {
      return new Promise((resolve, reject) => {
        let confirmed =
            this.exist(field) && this.exist(check_if[1]) && check_if[1]
              ? this.given_values[check_if[1]] == this.given_values[field]
              : true,
          error_message = '';

        if (this.exist(field) && !this.exist(check_if[1])) {
          error_message = message ?? `${check_if[1]} is required`;
          reject(error_message);
        }

        if (!confirmed) {
          error_message =
            message ??
            `${field.replace('_', ' ')} is not matched with ${check_if[1]}`;
          reject(error_message);
        }
        resolve({
          valide: confirmed,
          message: error_message,
        });
      });
    },
    previous_password: async (
      field: string,
      check_if: string[],
      message: string,
    ) => {
      return new Promise(async (resolve, reject) => {
        let user = await this.repository.findOneBy({
            unique_id: this.given_values.user_info.unique_id,
          }),
          valid_password = bcrypt.compare(
            this.given_values[field],
            user.password,
          ),
          error_message = '';

        if (this.exist(field) && !valid_password) {
          error_message = message ?? `${field.replace('_', ' ')} not matched`;
          reject(error_message);
        }

        resolve({
          valide: valid_password,
          message: error_message,
        });
      });
    },
  };

  isInt(value: any) {
    return (
      !isNaN(value) &&
      (function (x) {
        return (x | 0) === x;
      })(parseFloat(value))
    );
  }

  isUuid(value: any) {
    const uuid_regexExp =
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    return value.match(uuid_regexExp);
  }

  async isUuidExist(
    fieldName: any = null,
    value: any,
    repository: any = null,
    key: string = null,
  ) {
    const given_repository = repository ?? this.existence_check[fieldName],
      query = {
        ...(key == null ? { unique_id: value } : {}),
        deleted: false,
      };
    if (key != null) {
      query[key] = value;
    }

    const exist = await given_repository.findOneBy(query);
    return exist;
  }

  isString(value: any) {
    return typeof value == 'string' && value.length > 0;
  }

  isObject(value: any) {
    return typeof value === 'object';
  }

  areArraysMatched(arr1: any, arr2: any) {
    // Check if the arrays have the same length
    if (arr1.length !== arr2.length) {
      return false;
    }

    // Compare each element of the arrays
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }

    // If we haven't returned false by this point, the arrays are matched
    return true;
  }

  async isSchemaMatched(
    field_name: string,
    object: Object,
    schema: object,
    repository: any = {},
  ) {
    const condition_check = {
      number: this.isInt,
      uuid: this.isUuid,
      string: this.isString,
    };

    const is_schema_matched = this.areArraysMatched(
      Object.keys(object),
      Object.keys(schema),
    );
    if (!is_schema_matched) {
      return {
        matched: false,
        message: `${field_name} value must be array of object with value of ${String(
          Object.keys(schema),
        )}`,
      };
    }

    if (is_schema_matched) {
      for (const index in object) {
        let value = object[index],
          check_if = schema[index],
          valid = condition_check[check_if](value);
        if (!valid) {
          return {
            matched: false,
            field: index,
            message: `${index} must be ${check_if}`,
          };
        }

        if (check_if == 'uuid') {
          let exist = await this.isUuidExist(null, value, repository[index]);
          if (!exist) {
            return {
              matched: false,
              field: index,
              message: `${index} not found`,
            };
          }
        }
      }

      return {
        matched: true,
        message: '',
      };
    }
  }

  exist(field: string) {
    let has = this.isInt(this.given_values[field])
      ? this.given_values[field] > 0
      : this.given_values[field]
        ? this.given_values[field].length > 0
        : false;
    return has;
  }

  isEmailValide(email: string): boolean {
    let email_ragex =
        /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      is_valide_email = email.match(email_ragex);
    return is_valide_email ? true : false;
  }

  async increament(key: string) {
    await this.repository
      .count()
      .then((result: any) => {
        this.given_values[key] = result + 1;
      })
      .catch((result: any) => {
        console.log(result);
      });
  }

  addErrorMessage(field: string, message: string, all_error: any) {
    all_error[field] = all_error[field] ? [...all_error[field]] : [];
    all_error[field] = [...all_error[field], message];
    return all_error;
  }

  async validatedData() {
    return new Promise(async (resolve, reject) => {
      let error = {};
      for (const key in this.condition) {
        let list = this.condition[key].list,
          message = this.condition[key].message;
        if (list && message) {
          let field = key;
          await this.singleFieldValidation(field, list, message)
            .then((response: any) => {})
            .catch((error_message) => {
              error[field] = error_message;
            });
        }
      }
      if (Object.keys(error).length > 0) reject(error);
      resolve(await this.getValues().then((response) => response));
    });
  }

  async singleFieldValidation(field: string, list: string[], message: any) {
    return new Promise(async (resolve, reject) => {
      let error_message = [];
      for (let i = 0; i < list.length; i++) {
        let check_if = list[i].split('|');
        await this.validation_method[check_if[0]](
          field,
          check_if,
          message[check_if[0]],
        )
          .then((response: any) => response)
          .catch((error: any) => {
            error_message.push(error);
          });
      }
      if (error_message.length > 0) reject(error_message);
      resolve(true);
    });
  }

  getValues() {
    return new Promise((resolve, reject) => {
      let values = {};
      Object.keys(this.condition).map((key, index) => {
        if (this.given_values[key]) values[key] = this.given_values[key];
      });
      resolve(values);
    });
  }

  addNewValidationMethod(key: string, func: Function) {
    // console.log(this.validation_method);
    this.validation_method[key] = func;
  }

  async validateRequestBody(value: any) {
    let total_number_of_record = await this.repository.count(),
      has_limit = value?.limit,
      limit_error_message = [
        ...(!has_limit ? ['please enter limit in "limit" field'] : []),
      ],
      has_page = value?.page,
      page_error_message = [
        ...(!has_page ? ['please enter page number in "page" field'] : []),
      ],
      error_message = {
        ...(page_error_message.length > 0 ? { page: page_error_message } : {}),
        ...(limit_error_message.length > 0
          ? { limit: limit_error_message }
          : {}),
      };
    if (value.page && value.limit) {
      if (value.page > Math.ceil(total_number_of_record / value.limit)) {
        value.page = 1;
      }
    }
    return { error_message, value };
  }
}

export function is_email_valide(email: string): boolean {
  let email_ragex =
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
    is_valide_email = email.match(email_ragex);
  return is_valide_email ? true : false;
}
