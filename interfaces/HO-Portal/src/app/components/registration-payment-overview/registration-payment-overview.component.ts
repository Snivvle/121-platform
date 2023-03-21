import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RegistrationStatusEnum } from '../../../../../../services/121-service/src/registration/enum/registration-status.enum';
import { AuthService } from '../../auth/auth.service';
import Permission from '../../auth/permission.enum';
import { Person } from '../../models/person.model';
import { Program } from '../../models/program.model';
import { PaymentHistoryPopupComponent } from '../../program/payment-history-popup/payment-history-popup.component';
import { ProgramsServiceApiService } from '../../services/programs-service-api.service';

class TableItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-registration-payment-overview',
  templateUrl: './registration-payment-overview.component.html',
  styleUrls: ['./registration-payment-overview.component.css'],
})
export class RegistrationPaymentOverviewComponent implements OnInit {
  @Input()
  private person: Person;

  @Input()
  private program: Program;

  @Input()
  public paymentsTable: TableItem[];

  private PAYMENTS_TABLE_LENGTH = 4;

  private canUpdatePaData: boolean;
  private canViewPersonalData: boolean;
  private canUpdatePersonalData: boolean;
  private canViewPaymentData: boolean;
  private canViewVouchers: boolean;
  private canDoSinglePayment: boolean;

  constructor(
    private translate: TranslateService,
    private modalController: ModalController,
    private programsService: ProgramsServiceApiService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    if (!this.person || !this.program) {
      return;
    }

    this.loadPermissions();

    this.fillPaymentsTable();
  }

  private async fillPaymentsTable() {
    this.paymentsTable = [];
    const minPayment = this.person.payment || 1;

    const payments = (
      await this.programsService.getTransactions(
        this.program.id,
        minPayment,
        this.person?.referenceId,
      )
    ).slice(0, this.person.maxPayments || this.PAYMENTS_TABLE_LENGTH);

    const itemLabel = (paymentNumber) =>
      this.translate.instant(
        'registration-details.payment-overview.paymentLabel',
        {
          paymentNumber: paymentNumber,
        },
      );

    const itemValue = (status) =>
      this.translate.instant(
        'page.program.program-people-affected.transaction.' + status,
      );

    for (let i = 0; i < this.PAYMENTS_TABLE_LENGTH; i++) {
      let label: string;
      let value: string;
      if (!payments[i]) {
        const paymentNumber = minPayment + i;
        const paymentSuccessionNr = paymentNumber - minPayment + 1;
        const paymentsRemaining =
          this.person.maxPayments - this.person.nrPayments;
        if (
          this.person.status !== RegistrationStatusEnum.included ||
          (this.person.maxPayments && paymentSuccessionNr > paymentsRemaining)
        ) {
          break;
        }
        label = itemLabel(paymentNumber);
        value = itemValue('planned');
      } else {
        label = itemLabel(payments[i].payment);
        value = itemValue(payments[i].status);
      }

      this.paymentsTable.push({ label, value });
    }

    const itemPaymentNumber = (s) => Number(s.split('#')[1]);
    this.paymentsTable.sort(
      (a, b) => itemPaymentNumber(b.label) - itemPaymentNumber(a.label),
    );
  }

  public async paymentHistoryPopup() {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: PaymentHistoryPopupComponent,
      componentProps: {
        person: this.person,
        programId: this.program.id,
        program: this.program,
        readOnly: !this.canUpdatePaData,
        canViewPersonalData: this.canViewPersonalData,
        canUpdatePersonalData: this.canUpdatePersonalData,
        canDoSinglePayment: this.canDoSinglePayment,
        canViewVouchers: this.canViewVouchers,
      },
    });
    await modal.present();
  }

  public showPaymentInfo(): boolean {
    const acceptedStatuses = [
      RegistrationStatusEnum.included,
      RegistrationStatusEnum.completed,
      RegistrationStatusEnum.inclusionEnded,
      RegistrationStatusEnum.rejected,
    ];

    if (!this.person) {
      return false;
    }

    if (
      acceptedStatuses.includes(this.person.status) &&
      this.canViewPaymentData
    ) {
      return true;
    }

    return false;
  }

  private loadPermissions() {
    this.canUpdatePaData = this.authService.hasAllPermissions(this.program.id, [
      Permission.RegistrationAttributeUPDATE,
    ]);
    this.canViewPersonalData = this.authService.hasAllPermissions(
      this.program.id,
      [Permission.RegistrationPersonalREAD],
    );
    this.canUpdatePersonalData = this.authService.hasAllPermissions(
      this.program.id,
      [Permission.RegistrationPersonalUPDATE],
    );

    this.canViewPaymentData = this.authService.hasAllPermissions(
      this.program.id,
      [Permission.PaymentREAD, Permission.PaymentTransactionREAD],
    );
    this.canViewVouchers = this.authService.hasAllPermissions(this.program.id, [
      Permission.PaymentVoucherREAD,
    ]);
    this.canDoSinglePayment = this.authService.hasAllPermissions(
      this.program.id,
      [
        Permission.ActionREAD,
        Permission.PaymentCREATE,
        Permission.PaymentREAD,
        Permission.PaymentTransactionREAD,
      ],
    );
  }
}
