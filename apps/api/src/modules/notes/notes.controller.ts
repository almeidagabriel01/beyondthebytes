import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { NotesService } from './notes.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import {
  CreateClinicalNoteSchema,
  UpdateClinicalNoteSchema,
  type CreateClinicalNote,
  type UpdateClinicalNote,
} from '@medschedule/shared';

@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get('appointments/:id/notes')
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notes.listByAppointment(id, user.id);
  }

  @Post('appointments/:id/notes')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateClinicalNoteSchema)) dto: CreateClinicalNote,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notes.create(id, dto, user.id);
  }

  @Patch('notes/:id')
  addRevision(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClinicalNoteSchema)) dto: UpdateClinicalNote,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notes.addRevision(id, dto, user.id);
  }
}
