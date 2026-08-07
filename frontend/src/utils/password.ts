export const MAX_PASSWORD_UTF8_BYTES = 72

export const getUtf8ByteLength = (value: string) =>
  new TextEncoder().encode(value).length

export const isPasswordWithinUtf8Limit = (value: string) =>
  getUtf8ByteLength(value) <= MAX_PASSWORD_UTF8_BYTES
