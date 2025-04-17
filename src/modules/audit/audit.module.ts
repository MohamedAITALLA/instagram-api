// src/modules/audit/audit.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AuditEntry, AuditEntrySchema } from './schemas/audit-entry.schema';
import { Model } from 'mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user-profile/user-profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditEntry.name, schema: AuditEntrySchema },
    ]),
  
    forwardRef(() => AuthModule),
    forwardRef(() => UserProfileModule),

  ],
  controllers: [AdminAuditController],
  providers: [AuditService, AdminAuditService, {
    provide: AuditEntry,
    useFactory: (auditEntryModel: Model<AuditEntry>) => auditEntryModel,
    inject: [getModelToken(AuditEntry.name)],
  }],
  exports: [AuditService, AdminAuditService, AuditEntry],
})
export class AuditModule {}
