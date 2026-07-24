import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';

const JWT_SECRET = 'logout-e2e-test-secret';

describe('Logout endpoint (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: JWT_SECRET,
        }),
      ],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: () => JWT_SECRET,
          },
        },
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/logout returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('POST /api/auth/logout returns 204 with an empty body when authenticated', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'test-user-id' });

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.NO_CONTENT)
      .expect((response) => {
        expect(response.text).toBe('');
      });
  });
});
