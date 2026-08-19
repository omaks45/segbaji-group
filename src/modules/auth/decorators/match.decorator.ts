import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';

/** Reused by both registration and password-reset DTOs — one implementation, not two. */
export function Match(property: string, validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
        name: 'Match',
        target: object.constructor,
        propertyName,
        options: validationOptions,
        constraints: [property],
        validator: {
            validate(value: unknown, args: ValidationArguments) {
            const [relatedPropertyName] = args.constraints;
            return value === (args.object as never)[relatedPropertyName];
            },
            defaultMessage(args: ValidationArguments) {
            const [relatedPropertyName] = args.constraints;
            return `${args.property} must match ${relatedPropertyName}`;
            },
        },
        });
    };
}