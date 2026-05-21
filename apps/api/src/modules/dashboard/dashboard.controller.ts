import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { KpisQuerySchema, type KpisQuery } from '@medschedule/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('today')
  getToday(@CurrentUser() user: RequestUser) {
    return this.dashboard.getToday(user.id);
  }

  @Get('kpis')
  getKpis(
    @Query(new ZodValidationPipe(KpisQuerySchema)) query: KpisQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.dashboard.getKpis(user.id, query.period);
  }
}
