import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  ListPatientsQuerySchema,
  type CreatePatient,
  type UpdatePatient,
  type ListPatientsQuery,
} from '@medschedule/shared';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreatePatientSchema)) dto: CreatePatient,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientsService.create(dto, user.id);
  }

  @Get()
  findAll(@Query(new ZodValidationPipe(ListPatientsQuerySchema)) query: ListPatientsQuery) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePatientSchema)) dto: UpdatePatient,
  ) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.patientsService.softDelete(id);
  }
}
