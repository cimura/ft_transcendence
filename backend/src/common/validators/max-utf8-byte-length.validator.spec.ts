import { validateSync } from 'class-validator';
import { MaxUtf8ByteLength } from './max-utf8-byte-length.validator';

class PasswordDto {
  @MaxUtf8ByteLength(72)
  password!: string;
}

describe('MaxUtf8ByteLength', () => {
  it.each([
    ['a'.repeat(72), true],
    ['a'.repeat(73), false],
    ['あ'.repeat(24), true],
    ['あ'.repeat(25), false],
    ['🔐'.repeat(18), true],
    ['🔐'.repeat(19), false],
  ])('validates %p by UTF-8 byte length', (password, valid) => {
    const dto = new PasswordDto();
    dto.password = password;

    expect(validateSync(dto).length === 0).toBe(valid);
  });
});
