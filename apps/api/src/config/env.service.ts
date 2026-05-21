import { Global, Injectable, Module } from '@nestjs/common';
import { parseEnv, type Env } from './env.schema';

@Injectable()
export class EnvService {
  readonly env: Readonly<Env>;

  constructor() {
    this.env = Object.freeze(parseEnv());
  }
}

@Global()
@Module({
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
