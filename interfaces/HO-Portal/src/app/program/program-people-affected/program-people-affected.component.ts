import { formatDate } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  AlertController,
  ModalController,
  Platform,
  PopoverController,
} from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SortDirection } from '@swimlane/ngx-datatable';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import Permission from 'src/app/auth/permission.enum';
import { DateFormat } from 'src/app/enums/date-format.enum';
import { BulkAction, BulkActionId } from 'src/app/models/bulk-actions.models';
import { AnswerType } from 'src/app/models/fsp.model';
import {
  Person,
  PersonRow,
  PersonTableColumn,
} from 'src/app/models/person.model';
import {
  PaTableAttribute,
  Program,
  ProgramPhase,
} from 'src/app/models/program.model';
import {
  TableFilterMultipleChoiceOption,
  TableFilterType,
} from 'src/app/models/table-filter.model';
import { TranslatableString } from 'src/app/models/translatable-string.model';
import { BulkActionsService } from 'src/app/services/bulk-actions.service';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';
import { PubSubEvent, PubSubService } from 'src/app/services/pub-sub.service';
import { TranslatableStringService } from 'src/app/services/translatable-string.service';
import { formatPhoneNumber } from 'src/app/shared/format-phone-number';
import { PaymentUtils } from 'src/app/shared/payment.utils';
import { environment } from 'src/environments/environment';
import { MessageHistoryPopupComponent } from '../../components/message-history-popup/message-history-popup.component';
import RegistrationStatus from '../../enums/registration-status.enum';
import {
  MessageStatus,
  MessageStatusMapping,
} from '../../models/message.model';
import { PaginationMetadata } from '../../models/pagination-metadata.model';
import { EnumService } from '../../services/enum.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { FilterService, PaginationFilter } from '../../services/filter.service';
import { PastPaymentsService } from '../../services/past-payments.service';
import { RegistrationsService } from '../../services/registrations.service';
import { actionResult } from '../../shared/action-result';
import { SubmitPaymentProps } from '../../shared/confirm-prompt/confirm-prompt.component';
import { EditPersonAffectedPopupComponent } from '../edit-person-affected-popup/edit-person-affected-popup.component';
import { PaymentHistoryPopupComponent } from '../payment-history-popup/payment-history-popup.component';

@Component({
  selector: 'app-program-people-affected',
  templateUrl: './program-people-affected.component.html',
  styleUrls: ['./program-people-affected.component.scss'],
})
export class ProgramPeopleAffectedComponent implements OnDestroy {
  @ViewChild('proxyScrollbar')
  private proxyScrollbar: ElementRef;

  @Input()
  public programId: number;
  @Input()
  public thisPhase: ProgramPhase;
  @Output()
  isCompleted: EventEmitter<boolean> = new EventEmitter<boolean>();

  public phaseEnum = ProgramPhase;

  public program: Program;
  private paTableAttributes: PaTableAttribute[];
  public activePhase: ProgramPhase;

  private locale: string;

  public isLoading: boolean;

  private columnWidthPerType = {
    [AnswerType.Number]: 90,
    [AnswerType.Date]: 180,
    [AnswerType.PhoneNumber]: 130,
    [AnswerType.Text]: 150,
    [AnswerType.Enum]: 160,
    [AnswerType.Email]: 180,
    [AnswerType.Boolean]: 90,
    [AnswerType.MultiSelect]: 180,
  };
  public columnDefaults: any;
  public columns: PersonTableColumn[] = [];
  private standardColumns: PersonTableColumn[] = [];
  public paymentHistoryColumn: PersonTableColumn;

  public allPeopleAffected: PersonRow[] = [];
  public selectedPeople: PersonRow[] = [];
  private initialVisiblePeopleAffected: PersonRow[] = [];
  public visiblePeopleAffected: PersonRow[] = [];

  public headerChecked = false;
  public headerSelectAllVisible = false;

  public isInProgress = false;

  public submitPaymentProps: SubmitPaymentProps;
  public emptySeparatorWidth = 40;

  public action: BulkActionId = BulkActionId.chooseAction;
  public BulkActionEnum = BulkActionId;
  public bulkActions: BulkAction[] = [];
  public applyBtnDisabled = true;
  public submitWarning: any;

  public tableFilterType = TableFilterType;

  public canViewPersonalData: boolean;
  private canViewMessageHistory: boolean;
  private canUpdatePaData: boolean;
  private canUpdatePaFsp: boolean;
  private canUpdatePersonalData: boolean;
  private canViewPaymentData: boolean;
  private canViewVouchers: boolean;
  private canDoSinglePayment: boolean;
  private routerSubscription: Subscription;
  private pubSubSubscription: Subscription;

  public isStatusFilterPopoverOpen = false;
  public tableFilters = [
    {
      prop: 'paStatus',
      type: this.tableFilterType.multipleChoice,
      description: 'multiple-choice-hidden-options',
    },
  ];
  public tableFilterState = {
    text: { column: null, value: '' },
    paStatus: {
      default: [],
      selected: [],
      visible: [],
    },
  };

  public tableFiltersPerColumn: { name: string; label: string }[] = [];
  public tableTextFilter: PaginationFilter[] = [];
  public columnsPerPhase: PaTableAttribute[];

  private messageColumnStatus = MessageStatusMapping;
  public pageMetaData: PaginationMetadata;
  private paStatusDefaultsPerPhase = {
    [ProgramPhase.registrationValidation]: [
      RegistrationStatus.imported,
      RegistrationStatus.invited,
      RegistrationStatus.startedRegistration,
      RegistrationStatus.selectedForValidation,
      RegistrationStatus.registered,
      RegistrationStatus.noLongerEligible,
      RegistrationStatus.registeredWhileNoLongerEligible,
    ],
    [ProgramPhase.inclusion]: [
      RegistrationStatus.validated,
      RegistrationStatus.registered,
      RegistrationStatus.selectedForValidation,
      RegistrationStatus.rejected,
      RegistrationStatus.inclusionEnded,
    ],
    [ProgramPhase.payment]: [
      RegistrationStatus.included,
      RegistrationStatus.completed,
    ],
  };

  constructor(
    private authService: AuthService,
    private programsService: ProgramsServiceApiService,
    public translate: TranslateService,
    private bulkActionService: BulkActionsService,
    private pastPaymentsService: PastPaymentsService,
    private alertController: AlertController,
    public modalController: ModalController,
    public popoverController: PopoverController,
    public platform: Platform,
    private pubSub: PubSubService,
    private router: Router,
    private translatableStringService: TranslatableStringService,
    private errorHandlerService: ErrorHandlerService,
    private enumService: EnumService,
    private registrationsService: RegistrationsService,
    private filterService: FilterService,
  ) {
    this.registrationsService?.setCurrentPage(0);
    this.registrationsService?.setItemsPerPage(12);
    this.pageMetaData = this.registrationsService?.getPageMetadata();
    this.locale = environment.defaultLocale;
    this.routerSubscription = this.router.events.subscribe(async (event) => {
      if (event instanceof NavigationEnd) {
        if (event.url.includes(this.thisPhase)) {
          this.initComponent();
        }
      }
    });

    this.submitWarning = {
      message: '',
      people: this.translate.instant(
        'page.program.program-people-affected.submit-warning-people-affected',
      ),
    };

    this.columnDefaults = {
      draggable: false,
      resizeable: false,
      sortable: true,
      comparator: undefined,
      frozenLeft: false,
      phases: [
        ProgramPhase.registrationValidation,
        ProgramPhase.inclusion,
        ProgramPhase.payment,
      ],
      permissions: [Permission.RegistrationREAD],
      showIfNoValidation: true,
      headerClass: 'ion-text-wrap ion-align-self-end',
    };

    this.standardColumns = [
      {
        prop: 'phoneNumber',
        name: this.translate.instant(
          'page.program.program-people-affected.column.phoneNumber',
        ),
        ...this.columnDefaults,
        frozenLeft: this.platform.width() > 1280,
        permissions: [Permission.RegistrationPersonalREAD],
        minWidth: this.columnWidthPerType[AnswerType.PhoneNumber],
        width: this.columnWidthPerType[AnswerType.PhoneNumber],
      },
      {
        prop: 'preferredLanguage',
        name: this.translate.instant(
          'page.program.program-people-affected.column.preferredLanguage',
        ),
        ...this.columnDefaults,
        sortable: false, // TODO: disabled, because sorting in the backend is does on values (nl/en) instead of frontend labels (Dutch/English)
        permissions: [Permission.RegistrationPersonalREAD],
        minWidth: this.columnWidthPerType[AnswerType.Text],
        width: this.columnWidthPerType[AnswerType.Text],
      },
      {
        prop: 'status',
        name: this.translate.instant(
          'page.program.program-people-affected.column.status',
        ),
        ...this.columnDefaults,
        minWidth: 135,
        width: 135,
        frozenLeft: this.platform.width() > 1280,
      },
      {
        prop: 'registrationCreated',
        name: this.translate.instant(
          'page.program.program-people-affected.column.registration-created',
        ),
        ...this.columnDefaults,
        phases: [ProgramPhase.registrationValidation],
        minWidth: this.columnWidthPerType[AnswerType.Date],
        width: this.columnWidthPerType[AnswerType.Date],
      },
      {
        prop: 'paymentAmountMultiplier',
        name: this.translate.instant(
          'page.program.program-people-affected.column.paymentAmountMultiplier',
        ),
        ...this.columnDefaults,
        comparator: this.paComparator.bind(this),
        minWidth: this.columnWidthPerType[AnswerType.Number],
        width: this.columnWidthPerType[AnswerType.Number],
      },
      {
        prop: 'maxPayments',
        name: this.translate.instant(
          'page.program.program-people-affected.column.maxPayments',
        ),
        ...this.columnDefaults,
        minWidth: 150,
        width: 150,
      },
      {
        prop: 'financialServiceProvider',
        name: this.translate.instant(
          'page.program.program-people-affected.column.fspDisplayNamePortal',
        ),
        ...this.columnDefaults,
        minWidth: 220,
        width: 220,
      },
      {
        prop: 'lastMessageStatus',
        name: this.translate.instant(
          'page.program.program-people-affected.column.lastMessageStatus',
        ),
        ...this.columnDefaults,
        phases: [
          ProgramPhase.registrationValidation,
          ProgramPhase.inclusion,
          ProgramPhase.payment,
        ],
        minWidth: 200,
        width: 200,
      },
    ];

    this.filterService.getTextFilterSubscription().subscribe(async (filter) => {
      this.tableTextFilter = filter;
      await this.getPage();
    });
  }
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.pubSubSubscription) {
      this.pubSubSubscription.unsubscribe();
    }
  }

  async initComponent() {
    this.isLoading = true;

    this.columns = [];

    await this.loadProgram();

    await this.loadPermissions();

    this.paTableAttributes = await this.programsService.getPaTableAttributes(
      this.programId,
      this.thisPhase,
    );

    this.activePhase = this.program.phase;

    await this.setupStatusFilter();

    await this.loadColumns();

    await this.refreshData();

    await this.updateBulkActions();

    this.tableFiltersPerColumn = await this.updateTableFiltersPerColumn();

    this.submitPaymentProps = {
      programId: this.programId,
      payment: null,
      referenceIds: [],
    };

    // Timeout to make sure the datatable elements are rendered/generated:
    window.setTimeout(() => {
      this.setupProxyScrollbar();
    }, 0);

    // Listen for external signals to refresh data shown in table:
    if (!this.pubSubSubscription) {
      this.pubSubSubscription = this.pubSub.subscribe(
        PubSubEvent.dataRegistrationChanged,
        () => {
          if (this.router.url.includes(this.thisPhase)) {
            this.refreshData();
          }
        },
      );
    }

    this.updateProxyScrollbarSize();

    this.isCompleted.emit(true);
  }

  private async setupStatusFilter() {
    this.tableFilterState.paStatus.default =
      this.paStatusDefaultsPerPhase[this.thisPhase];
    this.tableFilterState.paStatus.visible =
      await this.getStatusFilterOptions();
    this.tableFilterState.paStatus.selected = [
      ...this.tableFilterState.paStatus.default,
    ];
  }

  private async getStatusFilterOptions(): Promise<
    TableFilterMultipleChoiceOption[]
  > {
    const registrationStatusesWithCount =
      await this.programsService.getRegistrationStatusCount(this.programId);
    return registrationStatusesWithCount.map(({ status, statusCount }) => {
      const option: TableFilterMultipleChoiceOption = {
        value: status,
        label: this.translate.instant(
          'page.program.program-people-affected.status.' + status,
        ),
        count: Number(statusCount),
      };
      return option;
    });
  }

  private async refreshData() {
    this.isLoading = true;
    await this.loadData();
    await this.resetBulkAction();
    this.updateProxyScrollbarSize();
    this.isLoading = false;
  }

  private async loadProgram() {
    this.program = await this.programsService.getProgramById(this.programId);
  }
  private async loadPermissions() {
    this.canUpdatePaData = this.authService.hasAllPermissions(this.programId, [
      Permission.RegistrationAttributeUPDATE,
    ]);
    this.canUpdatePaFsp = this.authService.hasAllPermissions(this.programId, [
      Permission.RegistrationFspUPDATE,
    ]);
    this.canViewPersonalData = this.authService.hasAllPermissions(
      this.programId,
      [Permission.RegistrationPersonalREAD],
    );
    this.canUpdatePersonalData = this.authService.hasAllPermissions(
      this.programId,
      [Permission.RegistrationPersonalUPDATE],
    );
    this.canViewMessageHistory = this.authService.hasAllPermissions(
      this.programId,
      [Permission.RegistrationNotificationREAD],
    );
    this.canViewPaymentData = this.authService.hasAllPermissions(
      this.programId,
      [Permission.PaymentREAD, Permission.PaymentTransactionREAD],
    );
    this.canViewVouchers = this.authService.hasAllPermissions(this.programId, [
      Permission.PaymentVoucherREAD,
    ]);
    this.canDoSinglePayment = this.authService.hasAllPermissions(
      this.programId,
      [
        Permission.ActionREAD,
        Permission.PaymentCREATE,
        Permission.PaymentREAD,
        Permission.PaymentTransactionREAD,
      ],
    );
  }

  private setupProxyScrollbar() {
    const proxyScrollElement = this.proxyScrollbar.nativeElement;
    const config = proxyScrollElement.dataset;

    if (
      !proxyScrollElement ||
      !config ||
      !config.targetScrollElementSelector ||
      !config.targetWidthElementSelector
    ) {
      return;
    }

    const parentScope = this.proxyScrollbar.nativeElement.parentElement;

    const targetScrollElement: HTMLElement = parentScope.querySelector(
      config.targetScrollElementSelector,
    );

    if (!targetScrollElement) {
      return;
    }

    // Link scroll-events of proxy and target-elements:
    proxyScrollElement.addEventListener('scroll', () => {
      targetScrollElement.scrollLeft = proxyScrollElement.scrollLeft;
    });
    targetScrollElement.addEventListener('scroll', () => {
      proxyScrollElement.scrollLeft = targetScrollElement.scrollLeft;
    });

    // Set initial size of proxy-content:
    this.updateProxyScrollbarSize();
  }

  private updateProxyScrollbarSize() {
    window.setTimeout(() => {
      const proxyScrollElement = this.proxyScrollbar.nativeElement;
      const proxyScrollbarWidthElement: HTMLElement =
        proxyScrollElement.querySelector('.proxy-scrollbar--content');
      if (!proxyScrollElement || !proxyScrollbarWidthElement) {
        return;
      }

      let targetWidth = '';
      const targetWidthElement: HTMLElement =
        proxyScrollElement.parentElement.querySelector(
          proxyScrollElement.dataset.targetWidthElementSelector,
        );

      if (targetWidthElement) {
        targetWidth = targetWidthElement.style.width;
      }
      proxyScrollbarWidthElement.style.width = targetWidth;
    }, 0);
  }

  private async loadColumns() {
    this.loadNameColumns();
    for (const column of this.standardColumns) {
      if (
        column.phases.includes(this.thisPhase) &&
        this.authService.hasAllPermissions(
          this.programId,
          column.permissions,
        ) &&
        this.checkValidationColumnOrAction(column) &&
        this.showMaxPaymentsColumn(column)
      ) {
        this.columns.push(column);
      }
    }

    this.columnsPerPhase = await this.programsService.getPaTableAttributes(
      this.programId,
      this.thisPhase,
    );

    if (!this.columnsPerPhase) {
      return;
    }

    for (const colPerPhase of this.columnsPerPhase) {
      const addCol = {
        prop: colPerPhase.name,
        name: this.createColumnNameLabel(
          colPerPhase.name,
          colPerPhase.shortLabel,
        ),
        ...this.columnDefaults,
        permissions: [Permission.RegistrationPersonalREAD],
        phases: colPerPhase.phases,
        headerClass: 'ion-align-self-end header-overflow-ellipsis',
      };
      if (this.columnWidthPerType[colPerPhase.type]) {
        addCol.minWidth = this.columnWidthPerType[colPerPhase.type];
        addCol.width = this.columnWidthPerType[colPerPhase.type];
      } else {
        addCol.minWidth = this.columnWidthPerType.text;
        addCol.width = this.columnWidthPerType.text;
      }
      if (
        this.authService.hasAllPermissions(this.programId, addCol.permissions)
      ) {
        this.columns.push(addCol);
      }
    }

    if (this.canViewPaymentData && this.thisPhase === ProgramPhase.payment) {
      this.paymentHistoryColumn = this.createPaymentHistoryColumn();
    }
  }

  private loadNameColumns() {
    if (this.canViewPersonalData) {
      for (const nameColumn of this.program.fullnameNamingConvention) {
        const searchableColumns = [
          ...this.program.programQuestions,
          ...this.program.programCustomAttributes,
        ];

        const nameQuestion = searchableColumns.find(
          (question) => question.name === nameColumn,
        );
        if (nameQuestion) {
          const addCol = {
            prop: nameColumn,
            name: this.translatableStringService.get(
              nameQuestion.shortLabel || nameQuestion.label,
            ),
            ...this.columnDefaults,
            frozenLeft: this.platform.width() > 768,
            permissions: [Permission.RegistrationPersonalREAD],
            minWidth: this.columnWidthPerType[AnswerType.Text],
            width: this.columnWidthPerType[AnswerType.Text],
          };
          this.columns.push(addCol);
        }
      }
    }
  }

  private checkValidationColumnOrAction(columnOrAction) {
    return (
      (columnOrAction.showIfNoValidation && !this.program.validation) ||
      this.program.validation
    );
  }

  private showMaxPaymentsColumn(column: PersonTableColumn): boolean {
    return (
      column.prop !== 'maxPayments' ||
      (column.prop === 'maxPayments' && this.program.enableMaxPayments)
    );
  }

  private createColumnNameLabel(
    columnName: string,
    columnShortlLabel?: TranslatableString,
  ): string {
    if (columnShortlLabel) {
      return this.translatableStringService.get(columnShortlLabel);
    }

    this.translate.instant(
      `page.program.program-people-affected.column.${columnName}`,
    );
  }

  private createPaymentHistoryColumn(): PersonTableColumn {
    return {
      prop: 'paymentHistory',
      name: this.translate.instant(
        'page.program.program-people-affected.column.payment-history',
      ),
      ...this.columnDefaults,
      sortable: false,
      phases: [ProgramPhase.payment],
      permissions: [Permission.RegistrationPersonalREAD],
      minWidth: 200,
      width: 200,
    };
  }

  private async updateBulkActions() {
    await this.addPaymentBulkActions();

    this.bulkActions = this.bulkActionService.getBulkActions().map((action) => {
      action.enabled =
        this.authService.hasAllPermissions(
          this.programId,
          action.permissions,
        ) &&
        action.phases.includes(this.thisPhase) &&
        this.checkValidationColumnOrAction(action);
      return action;
    });
  }

  private async updateTableFiltersPerColumn(): Promise<
    { name: string; label: string }[]
  > {
    const tableFiltersPerColumn = [];

    for (const columnName of this.program.filterableAttributes) {
      const column = this.program.paTableAttributes.find(
        (column) => column.name === columnName.name,
      );
      let label: string;

      if (column && column.shortLabel) {
        label = this.translatableStringService.get(column.shortLabel);
      } else {
        label = this.translate.instant(
          `page.program.program-people-affected.column.${columnName.name}`,
        );
      }

      tableFiltersPerColumn.push({ name: columnName.name, label: label });

      if (columnName.name === 'successPayment') {
        // TODO: Refactor: this is hard-coded & it assumes that 'successPayment' is the last of the 3 payment variables as defined in programs.service. This should be replaced by a more robust solution.
        tableFiltersPerColumn.push({
          name: 'divider',
          label: '------------------------------------------',
        });
      }
    }

    return tableFiltersPerColumn;
  }

  private async addPaymentBulkActions() {
    // filter out all dopayment actions to avoid duplication
    this.bulkActions = this.bulkActions.filter(
      (action) => action.id !== BulkActionId.doPayment,
    );

    const nextPaymentId = await this.pastPaymentsService.getNextPaymentId(
      this.program,
    );
    let paymentId = nextPaymentId || this.program.distributionDuration;

    // Add bulk-action for 1st upcoming payment & past 5 payments
    // Note, the number 5 is the same as allowed for the single payment as set in payment-history-popup.component
    while (paymentId > nextPaymentId - 6 && paymentId > 0) {
      const paymentBulkAction = {
        id: BulkActionId.doPayment,
        enabled: true,
        label: `${this.translate.instant(
          'page.program.program-people-affected.actions.do-payment',
        )} #${paymentId}`,
        permissions: [Permission.PaymentCREATE],
        phases: [ProgramPhase.payment],
        showIfNoValidation: true,
      };
      this.bulkActions.push(paymentBulkAction);
      paymentId--;
    }
  }

  public hasEnabledActions(): boolean {
    const enabledActions = this.bulkActions.filter((a) => a.enabled);
    return enabledActions.length > 0;
  }

  private async loadData() {
    // TODO: How do we get people per phase now..
    this.setPage({
      offset: this.registrationsService?.getPageMetadata().currentPage,
    });
  }

  private createTableData(source: Person[]): PersonRow[] {
    if (!source || source.length === 0) {
      return [];
    }
    return source.map((person) => this.createPersonRow(person));
  }

  private createPersonRow(person: Person): PersonRow {
    let personRow: PersonRow = {
      id: person.registrationProgramId,
      referenceId: person.referenceId,
      checkboxVisible: false,
      registrationProgramId: person.personAffectedSequence,
      registrationStatus: person.status,
      status: this.translate.instant(
        'page.program.program-people-affected.status.' + person.status,
      ),
      registrationCreated: person.registrationCreated
        ? formatDate(
            person.registrationCreated,
            DateFormat.dayAndTime,
            this.locale,
          )
        : null,
      inclusionScore: person.inclusionScore,
      preferredLanguage: person.preferredLanguage
        ? this.enumService.getEnumLabel(
            'preferredLanguage',
            person.preferredLanguage,
          )
        : '',
      phoneNumber: formatPhoneNumber(person.phoneNumber),
      paymentAmountMultiplier: person.paymentAmountMultiplier
        ? `${person.paymentAmountMultiplier}×`
        : '',
      paymentCountRemaining: person.paymentCountRemaining,
      maxPayments: person.maxPayments
        ? `${person.maxPayments} ${
            [ProgramPhase.inclusion, ProgramPhase.payment].includes(
              this.thisPhase,
            )
              ? `(${
                  person.maxPayments - person.paymentCount
                } ${this.translate.instant(
                  'page.program.program-people-affected.max-payments.left',
                )})`
              : ''
          }`
        : '',
      fsp: person.financialServiceProvider,
      financialServiceProvider: person.fspDisplayNamePortal,
      lastMessageStatus: person.lastMessageStatus,
      hasNote: !!person.note,
      hasPhoneNumber: !!person.hasPhoneNumber,
    };

    if (this.canViewPaymentData) {
      personRow = this.fillPaymentHistoryColumn(personRow);
    }

    // Custom attributes can be personal data or not personal data
    // for now only users that view custom data can see it
    if (this.canViewPersonalData) {
      personRow = this.fillPaTableAttributeRows(person, personRow);
      personRow = this.fillNameColumns(person, personRow);
    }

    return personRow;
  }

  private fillPaTableAttributeRows(
    person: Person,
    personRow: PersonRow,
  ): PersonRow {
    for (const paTableAttribute of this.paTableAttributes) {
      let value = person[paTableAttribute.name];
      if (value === 'true') {
        value = true;
      }
      if (value === 'false') {
        value = false;
      }
      personRow[paTableAttribute.name] = value;
    }
    return personRow;
  }

  private fillNameColumns(person: Person, personRow: PersonRow): PersonRow {
    for (const key of this.program.fullnameNamingConvention) {
      const value = person[key];
      personRow[key] = value;
    }
    return personRow;
  }

  private fillPaymentHistoryColumn(personRow: PersonRow): PersonRow {
    const columnKey = 'paymentHistoryColumn';
    personRow[columnKey] = this.translate.instant(
      'page.program.program-people-affected.transaction.payments-popup',
    );
    return personRow;
  }

  public hasVoucherSupport(fsp: string): boolean {
    const voucherFsps = [
      'Intersolve-voucher-paper',
      'Intersolve-voucher-whatsapp',
    ];
    return voucherFsps.includes(fsp);
  }

  public showInclusionScore(): boolean {
    let show = false;
    for (const pa of this.allPeopleAffected) {
      show = !!pa.inclusionScore;
      if (show) {
        break;
      }
    }
    return show;
  }

  public showWhatsappNumber(): boolean {
    let show = false;
    for (const pa of this.allPeopleAffected) {
      show = PaymentUtils.hasVoucherSupport(pa.fsp);
      if (show) {
        break;
      }
    }
    return show;
  }

  public async editPersonAffectedPopup(row: PersonRow, programId: number) {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: EditPersonAffectedPopupComponent,
      componentProps: {
        programId,
        referenceId: row.referenceId,
        canUpdatePaData: this.canUpdatePaData,
        canViewPersonalData: this.canViewPersonalData,
        canUpdatePersonalData: this.canUpdatePersonalData,
        canUpdatePaFsp: this.canUpdatePaFsp,
        canViewMessageHistory: this.canViewMessageHistory,
        canViewPaymentData: this.canViewPaymentData,
      },
    });

    await modal.present();
  }

  public async paymentHistoryPopup(personRow: PersonRow) {
    const person = this.visiblePeopleAffected.find(
      (pa) => pa.referenceId === personRow.referenceId,
    );
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: PaymentHistoryPopupComponent,
      componentProps: {
        person,
        program: this.program,
        canViewPersonalData: this.canViewPersonalData,
        canViewPaymentData: this.canViewPaymentData,
        canViewVouchers: this.canViewVouchers,
        canDoSinglePayment: this.canDoSinglePayment,
      },
    });
    await modal.present();
  }

  public async openMessageHistoryPopup(
    personRow: PersonRow,
    programId: number,
  ) {
    const referenceId = personRow.referenceId;
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: MessageHistoryPopupComponent,
      componentProps: {
        referenceId,
        programId,
      },
    });
    await modal.present();
  }

  public async selectAction($event) {
    if (this.action === BulkActionId.chooseAction) {
      this.resetBulkAction();
      return;
    }

    if (this.action === BulkActionId.doPayment) {
      const dropdownOptionLabel =
        $event.target.options[$event.target.options.selectedIndex].text;
      this.submitPaymentProps.payment = Number(
        dropdownOptionLabel.split('#')[1],
      );
    }
    this.allPeopleAffected = await this.updatePeopleForAction(
      this.allPeopleAffected,
      this.action,
      this.submitPaymentProps.payment,
    );

    this.toggleHeaderCheckbox();
    this.updateSubmitWarning(this.selectedPeople.length);

    const nrCheckboxes = this.countSelectable(this.allPeopleAffected);
    if (nrCheckboxes === 0) {
      this.resetBulkAction();
      actionResult(
        this.alertController,
        this.translate,
        this.translate.instant(
          'page.program.program-people-affected.no-checkboxes',
        ),
        true,
        PubSubEvent.dataRegistrationChanged,
        this.pubSub,
      );
    }
  }

  private async updatePeopleForAction(
    people: PersonRow[],
    action: BulkActionId,
    payment?: number,
  ) {
    let registrationsWithPayment;
    // if (payment) {
    // registrationsWithPayment = (
    //   await this.programsService.getPeopleAffected(
    //     this.programId,
    //     null,
    //     payment,
    //   )
    // ).data.map((r) => r.referenceId);
    // }
    return people.map((person) =>
      this.bulkActionService.updateCheckbox(
        action,
        person,
        payment ? registrationsWithPayment.includes(person.referenceId) : null,
      ),
    );
  }

  private async resetBulkAction() {
    this.isInProgress = true;
    this.action = BulkActionId.chooseAction;
    this.applyBtnDisabled = true;
    this.toggleHeaderCheckbox();
    this.headerChecked = false;
    this.selectedPeople = [];
    this.isInProgress = false;
  }

  private toggleHeaderCheckbox() {
    if (this.countSelectable(this.allPeopleAffected) < 1) {
      this.headerSelectAllVisible = false;
      return;
    }
    this.headerSelectAllVisible = !this.headerSelectAllVisible;
  }

  public isRowSelectable(row: PersonRow): boolean {
    return row.checkboxVisible || false;
  }

  public onSelect(newSelected: PersonRow[]) {
    // This extra hack for 'de-select all' to work properly
    if (
      this.headerChecked &&
      newSelected.length === this.allPeopleAffected.length
    ) {
      newSelected = [];
    }

    const allSelectable = this.allPeopleAffected.filter(this.isRowSelectable);
    const prevSelectedCount = this.selectedPeople.length;
    const cleanNewSelected = newSelected.filter(this.isRowSelectable);

    // We need to distinguish between the header-select case and the single-row-selection, as they both call the same function
    const diffNewSelected = Math.abs(
      cleanNewSelected.length - prevSelectedCount,
    );
    const multiSelection = diffNewSelected > 1;

    if (!multiSelection) {
      // This is the single-row-selection case (although it also involves the going from (N-1) to N rows through header-selection)
      this.selectedPeople = cleanNewSelected;
      this.headerChecked = cleanNewSelected.length === allSelectable.length;
    } else {
      // This is the header-selection case
      if (!this.headerChecked) {
        // If checking ...
        this.selectedPeople = cleanNewSelected;
      } else {
        // If unchecking ...
        this.selectedPeople = [];
      }

      this.headerChecked = !this.headerChecked;
    }

    this.updateSubmitWarning(this.selectedPeople.length);

    if (this.action === BulkActionId.doPayment) {
      this.submitPaymentProps.referenceIds = this.selectedPeople.map(
        (p) => p.referenceId,
      );
    }

    if (this.selectedPeople.length) {
      this.applyBtnDisabled = false;
    } else {
      this.applyBtnDisabled = true;
    }
  }

  private countSelectable(rows: PersonRow[]) {
    return rows.filter(this.isRowSelectable).length;
  }

  public getCurrentBulkAction(): BulkAction {
    return this.bulkActions.find((i: BulkAction) => i.id === this.action);
  }

  private updateSubmitWarning(peopleCount: number) {
    if (!this.getCurrentBulkAction()) {
      return;
    }
    const actionLabel = this.getCurrentBulkAction().label;
    this.submitWarning.message = `
      ${actionLabel}: ${peopleCount} ${this.submitWarning.people}
    `;
  }

  public async applyAction(confirmInput?: string) {
    this.isInProgress = true;
    this.bulkActionService
      .applyAction(this.action, this.programId, this.selectedPeople, {
        message: confirmInput,
      })
      .then(async () => {
        if (
          this.action === BulkActionId.sendMessage ||
          this.action === BulkActionId.deletePa
        ) {
          this.pubSub.publish(PubSubEvent.dataRegistrationChanged);
          return;
        }

        const actionStatus = {
          [BulkActionId.invite]: RegistrationStatus.invited,
          [BulkActionId.selectForValidation]:
            RegistrationStatus.selectedForValidation,
          [BulkActionId.include]: RegistrationStatus.included,
          [BulkActionId.endInclusion]: RegistrationStatus.inclusionEnded,
          [BulkActionId.reject]: RegistrationStatus.rejected,
          [BulkActionId.markNoLongerEligible]:
            RegistrationStatus.noLongerEligible,
          [BulkActionId.pause]: RegistrationStatus.paused,
        };
        if (!actionStatus[this.action]) {
          return;
        }

        await actionResult(
          this.alertController,
          this.translate,
          `<p>${this.translate.instant(
            'page.program.program-people-affected.status-changed',
            {
              pastatus: this.translate
                .instant(
                  'page.program.program-people-affected.status.' +
                    actionStatus[this.action],
                )
                .toLowerCase(),
              panumber: this.selectedPeople.length,
            },
          )}
              <p>${this.translate.instant(
                'page.program.program-people-affected.pa-moved-phase',
              )}</p>`,
          true,
          PubSubEvent.dataRegistrationChanged,
          this.pubSub,
        );
      })
      .catch((error) => {
        console.log('Error:', error);
        actionResult(
          this.alertController,
          this.translate,
          error.error.errors.join('<br><br>'),
          true,
          PubSubEvent.dataRegistrationChanged,
          this.pubSub,
        );
      })
      .finally(() => {
        this.isInProgress = false;
      });
  }

  public applyFilter() {
    this.updateVisiblePeopleAffectedByFilter();
  }

  public paComparator(a: string, b: string) {
    // Use numeric sorting for 'text'-values, so the order will be: "PA #1" < "PA #2" < "PA #10"
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  public onCheckboxChange(row: PersonRow, column: any, value: string) {
    this.programsService
      .updatePaAttribute(this.programId, row.referenceId, column.prop, value)
      .then(
        () => {
          row[column.prop] = value;
          actionResult(
            this.alertController,
            this.translate,
            this.translate.instant('common.update-success'),
            true,
            PubSubEvent.dataRegistrationChanged,
            this.pubSub,
          );
        },
        (error) => {
          console.log('error: ', error);
          if (error && error.error) {
            const errorMessage = this.translate.instant('common.update-error', {
              error: this.errorHandlerService.formatErrors(
                error.error,
                column.prop,
              ),
            });
            actionResult(
              this.alertController,
              this.translate,
              errorMessage,
              true,
              PubSubEvent.dataRegistrationChanged,
              this.pubSub,
            );
          }
        },
      );
  }

  public applyTableFilter(prop, filter) {
    if (!filter) {
      return;
    }

    if (prop === 'paymentsLeft') {
      filter = filter.map((option) => Number(option));
    }

    if (this.tableFilterState[prop].selected === filter) {
      return;
    }

    this.tableFilterState[prop].selected = filter;
    this.setPage({
      offset: 0,
      pageSize: this.registrationsService?.getPageMetadata().itemsPerPage,
    });
  }

  private updateVisiblePeopleAffectedByFilter() {
    const filteredPeopleAffectedByStatus = this.allPeopleAffected.filter((pa) =>
      this.tableFilterState.paStatus.selected.includes(pa.registrationStatus),
    );

    this.initialVisiblePeopleAffected = [...filteredPeopleAffectedByStatus];

    const rowsVisible = this.initialVisiblePeopleAffected.filter(
      (row: PersonRow) => {
        // Loop over all columns
        for (const key of Object.keys(row)) {
          try {
            const columnValue = row[key].toLowerCase();
            const includeRow =
              columnValue.indexOf(this.tableFilterState.text) !== -1 || // check literal values
              columnValue
                .replace(/\s/g, '')
                .indexOf(this.tableFilterState.text) !== -1 || // check also with spaces removed
              !this.tableFilterState.text;
            if (includeRow) {
              return includeRow;
            }
          } catch {
            // Do not filter on unfilterable column types
          }
        }
      },
    );

    this.visiblePeopleAffected = rowsVisible;
    this.updateProxyScrollbarSize();
  }

  public showTableFilter(prop): boolean {
    if (
      prop !== 'paymentsLeft' ||
      (this.thisPhase === this.phaseEnum.payment &&
        this.program.enableMaxPayments)
    ) {
      return true;
    }

    return false;
  }

  public hasMessageError(messageStatus): boolean {
    return this.messageColumnStatus[messageStatus] === MessageStatus.failed;
  }

  public hasMessageSuccess(messageStatus): boolean {
    return [
      MessageStatus.delivered,
      MessageStatus.read,
      MessageStatus.sent,
    ].includes(messageStatus);
  }

  public async setPage(pageInfo: {
    offset: number;
    count?: number;
    pageSize?: number;
    limit?: number;
  }) {
    this.isLoading = true;
    this.registrationsService?.setCurrentPage(pageInfo.offset);

    await this.getPage();

    this.isLoading = false;
  }

  private async getPage(): Promise<void> {
    const { data, meta } = await this.registrationsService.getPage(
      this.programId,
      null,
      null,
      null,
      this.tableFilterState['paStatus'].selected,
      this.tableTextFilter,
    );

    this.visiblePeopleAffected = this.createTableData(data);
    this.registrationsService?.setTotalItems(meta.totalItems);
    this.registrationsService?.setCurrentPage(meta.currentPage - 1);

    this.updateProxyScrollbarSize();
  }

  public async onSort(event: {
    sorts: {
      dir: SortDirection;
      prop: string;
    }[];
    column: '';
    prevValue: '';
    newvalue: '';
  }) {
    this.registrationsService?.setSortBy(
      event.sorts[0].prop,
      event.sorts[0].dir,
    );

    this.setPage({
      // Front-end already resets to page 1 automatically. This makes sure that also API-call is reset to page 1.
      offset: 0,
    });
  }
}
