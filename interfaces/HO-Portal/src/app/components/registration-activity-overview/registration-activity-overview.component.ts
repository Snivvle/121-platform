import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateFormat } from 'src/app/enums/date-format.enum';
import { AuthService } from '../../auth/auth.service';
import Permission from '../../auth/permission.enum';
import { Person } from '../../models/person.model';
import { ProgramsServiceApiService } from '../../services/programs-service-api.service';

class ActivityOverviewItem {
  type: string;
  label: string;
  date: Date;
  description: string;
}

enum ActivityOverviewType {
  message = 'message',
  status = 'status',
  payment = 'payment',
}

@Component({
  selector: 'app-registration-activity-overview',
  templateUrl: './registration-activity-overview.component.html',
  styleUrls: ['./registration-activity-overview.component.scss'],
})
export class RegistrationActivityOverviewComponent implements OnInit {
  @Input()
  private person: Person;

  @Input()
  private programId: number;

  @Input()
  private referenceId: string;

  public DateFormat = DateFormat;
  public activityOverview: ActivityOverviewItem[];
  public activityOverviewFilter: string = null;
  public activityOverviewButtons = [
    null,
    ActivityOverviewType.message,
    ActivityOverviewType.status,
    ActivityOverviewType.payment,
  ];

  private canViewPersonalData: boolean;
  private canViewMessageHistory: boolean;
  private canViewPaymentData: boolean;

  private statusDateKey = {
    imported: 'importedDate',
    invited: 'invitedDate',
    noLongerEligible: 'noLongerEligibleDate',
    startedRegistration: 'startedRegistrationDate',
    registered: 'registeredDate',
    registeredWhileNoLongerEligible: 'registeredWhileNoLongerEligibleDate',
    selectedForValidation: 'selectedForValidationDate',
    validated: 'validationDate',
    included: 'inclusionDate',
    inclusionEnded: 'inclusionEndDate',
    rejected: 'rejectionDate',
  };

  constructor(
    private programsService: ProgramsServiceApiService,
    private translate: TranslateService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    if (!this.person || !this.programId || !this.referenceId) {
      return;
    }

    this.loadPermissions();

    this.fillActivityOverview();
  }

  private async fillActivityOverview() {
    this.activityOverview = [];

    if (this.canViewMessageHistory) {
      const messageHistory = await this.programsService.retrieveMsgHistory(
        this.programId,
        this.referenceId,
      );

      for (const message of messageHistory) {
        this.activityOverview.push({
          type: ActivityOverviewType.message,
          label: this.translate.instant(
            'registration-details.activity-overview.activities.message.label',
          ),
          date: new Date(message.created),
          description: message.body,
        });
      }
    }

    if (this.canViewPaymentData) {
      const payments = await this.programsService.getTransactions(
        this.programId,
        1,
        this.referenceId,
      );

      for (const payment of payments) {
        this.activityOverview.push({
          type: ActivityOverviewType.payment,
          label: this.translate.instant(
            'registration-details.activity-overview.activities.payment.label',
            { number: payment.payment },
          ),
          date: new Date(payment.paymentDate),
          description: this.translate.instant(
            'registration-details.activity-overview.activities.payment.description',
            {
              number: payment.payment,
              status: this.translate.instant(
                'page.program.program-people-affected.transaction.' +
                  payment.status,
              ),
            },
          ),
        });
      }
    }

    if (this.canViewPersonalData) {
      for (const statusDate of this.getStatusDateList()) {
        this.activityOverview.push({
          type: ActivityOverviewType.status,
          label: this.translate.instant(
            'registration-details.activity-overview.activities.status.label',
          ),
          date: statusDate.date,
          description: this.translate.instant(
            'registration-details.activity-overview.activities.status.description',
            {
              status: this.translate.instant(
                'page.program.program-people-affected.status.' +
                  statusDate.status,
              ),
            },
          ),
        });
      }
    }

    this.activityOverview.sort((a, b) => (b.date > a.date ? 1 : -1));
  }

  public getIconName(type: ActivityOverviewType): string {
    const map = {
      [ActivityOverviewType.message]: 'mail-outline',
      [ActivityOverviewType.payment]: 'cash-outline',
      [ActivityOverviewType.status]: 'reload-circle-outline',
    };
    return map[type];
  }

  private getStatusDateList(): { status: string; date: Date }[] {
    const statusDates = [];
    for (const status of Object.keys(this.statusDateKey)) {
      const statusDateString = this.statusDateKey[status];
      if (this.person[statusDateString]) {
        statusDates.push({
          status,
          date: new Date(this.person[statusDateString]),
        });
      }
    }

    return statusDates;
  }

  public getFilteredActivityOverview(): ActivityOverviewItem[] {
    if (!this.activityOverviewFilter) {
      return this.activityOverview;
    }
    return this.activityOverview.filter(
      (item) => item.type === this.activityOverviewFilter,
    );
  }

  public getFilterCount(filter: string | null): number {
    if (!this.activityOverview) {
      return 0;
    }
    if (!filter) {
      return this.activityOverview.length;
    }
    return this.activityOverview.filter((item) => item.type === filter).length;
  }

  private loadPermissions() {
    this.canViewPersonalData = this.authService.hasAllPermissions(
      this.programId,
      [Permission.RegistrationPersonalREAD],
    );
    this.canViewMessageHistory = this.authService.hasAllPermissions(
      this.programId,
      [Permission.RegistrationNotificationREAD],
    );
    this.canViewPaymentData = this.authService.hasAllPermissions(
      this.programId,
      [Permission.PaymentREAD, Permission.PaymentTransactionREAD],
    );
  }
}
