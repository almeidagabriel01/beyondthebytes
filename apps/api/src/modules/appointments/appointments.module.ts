import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { TransitionsService } from './transitions.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, TransitionsService],
})
export class AppointmentsModule {}
