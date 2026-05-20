import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  CancelAppointmentSchema,
  ListAppointmentsQuerySchema,
  MonthSummaryQuerySchema,
  type CreateAppointment,
  type UpdateAppointment,
  type CancelAppointment,
  type ListAppointmentsQuery,
  type MonthSummaryQuery,
} from '@medschedule/shared';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('month-summary')
  getMonthSummary(
    @Query(new ZodValidationPipe(MonthSummaryQuerySchema)) query: MonthSummaryQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentsService.getMonthSummary(query.from, query.to, user.id);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(ListAppointmentsQuerySchema)) query: ListAppointmentsQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentsService.list(query, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateAppointmentSchema)) dto: CreateAppointment,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentsService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAppointmentSchema)) dto: UpdateAppointment,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentsService.update(id, dto, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelAppointmentSchema)) dto: CancelAppointment,
    @CurrentUser() user: RequestUser,
  ) {
    return this.appointmentsService.cancel(id, dto, user.id);
  }
}
