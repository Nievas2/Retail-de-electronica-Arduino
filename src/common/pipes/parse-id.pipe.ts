import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const n = Number(value);

    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }

    return n;
  }
}
