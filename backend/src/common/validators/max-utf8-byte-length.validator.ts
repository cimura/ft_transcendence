import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function MaxUtf8ByteLength(
  maxBytes: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxUtf8ByteLength',
      target: object.constructor,
      propertyName,
      constraints: [maxBytes],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' &&
            Buffer.byteLength(value, 'utf8') <= maxBytes
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be ${maxBytes} UTF-8 bytes or fewer`;
        },
      },
    });
  };
}
