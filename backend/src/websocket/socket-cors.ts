const DEFAULT_SOCKET_CORS_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:8443',
];

export function getSocketCorsOrigins(): string[] {
  const configuredOrigins = process.env.SOCKET_IO_CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length
    ? configuredOrigins
    : DEFAULT_SOCKET_CORS_ORIGINS;
}
