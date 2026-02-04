import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  root() {
    return {
      name: 'Arduino Store Backend',
      version: 'v1',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
