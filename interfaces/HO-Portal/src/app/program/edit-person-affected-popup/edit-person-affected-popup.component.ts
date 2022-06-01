import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Fsp } from 'src/app/models/fsp.model';
import { Person } from 'src/app/models/person.model';
import { Program, ProgramCustomAttribute } from 'src/app/models/program.model';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';
import { PubSubEvent, PubSubService } from 'src/app/services/pub-sub.service';

@Component({
  selector: 'app-edit-person-affected-popup',
  templateUrl: './edit-person-affected-popup.component.html',
  styleUrls: ['./edit-person-affected-popup.component.scss'],
})
export class EditPersonAffectedPopupComponent implements OnInit {
  @Input()
  public person: Person;

  @Input()
  public programId: number;

  @Input()
  public readOnly = false;

  @Input()
  public canViewPersonalData = false;

  @Input()
  public canUpdatePersonalData = false;

  private program: Program;

  public inProgress: any = {};

  public noteModel: string;
  public noteLastUpdate: string;
  public messageHistory: any;
  public historySize = 5;
  public trimBodyLength = 20;
  public imageString = '(image)';
  public rowIndex: number;

  public customAttributes: {}[] = [];

  public fspList: Fsp[] = [];
  public programFspLength = 0;
  public personFsp: Fsp;

  constructor(
    private modalController: ModalController,
    private translate: TranslateService,
    private programsService: ProgramsServiceApiService,
    private alertController: AlertController,
    private pubSub: PubSubService,
  ) {}

  async ngOnInit() {
    this.program = await this.programsService.getProgramById(this.programId);

    this.fillCustomAttributes();
    this.getFspList();

    if (this.canViewPersonalData) {
      this.getNote();
      this.getMessageHistory();
    }
  }

  public async updatePaAttribute(
    attribute: string,
    value: string,
  ): Promise<void> {
    this.inProgress[attribute] = true;
    this.programsService
      .updatePaAttribute(this.person.referenceId, attribute, value)
      .then(
        () => {
          this.inProgress[attribute] = false;
          this.actionResult(
            this.translate.instant('common.update-success'),
            true,
          );
        },
        (error) => {
          this.inProgress[attribute] = false;
          console.log('error: ', error);
          if (error && error.error) {
            const errorMessage = this.translate.instant('common.update-error', {
              error: this.formatErrors(error.error, attribute),
            });
            this.actionResult(errorMessage);
          }
        },
      );
  }

  private formatErrors(error, attribute: string): string {
    if (error.errors) {
      return this.formatConstraintsErrors(error.errors, attribute);
    }
    if (error.message) {
      return '<br><br>' + error.message + '<br>';
    }
  }

  private formatConstraintsErrors(errors, attribute: string): string {
    const attributeError = errors.find(
      (message) => message.property === attribute,
    );
    const attributeConstraints = Object.values(attributeError.constraints);
    return '<br><br>' + attributeConstraints.join('<br>');
  }

  private fillCustomAttributes() {
    this.customAttributes = this.program?.programCustomAttributes.map((ca) => {
      return {
        name: ca.name,
        type: ca.type,
        label: ca.label[this.translate.getDefaultLang()],
        value: this.person.customAttributes[ca.name].value,
        options: this.program.programQuestions.find(
          (question) => question.name === ca.name,
        ).options,
      };
    });
    this.customAttributes = this.customAttributes?.filter(
      (attribute: ProgramCustomAttribute) => {
        return attribute.type !== 'boolean';
      },
    );
  }

  private async getNote() {
    const note = await this.programsService.retrieveNote(
      this.person.referenceId,
    );

    this.noteModel = note.note;
    this.noteLastUpdate = note.noteUpdated;
  }

  private async getMessageHistory() {
    const msghistory = await this.programsService.retrieveMsgHistory(
      this.person.referenceId,
    );
    this.messageHistory = msghistory;
  }
  public async loadMore(historyLength) {
    this.historySize = historyLength;
  }
  public openMessageDetails(index) {
    if (index === this.rowIndex) {
      this.rowIndex = null;
    } else {
      this.rowIndex = index;
    }
  }

  public async saveNote() {
    this.inProgress.note = true;
    await this.programsService
      .updateNote(this.person.referenceId, this.noteModel)
      .then(
        (note) => {
          this.actionResult(
            this.translate.instant('common.update-success'),
            true,
          );
          this.noteLastUpdate = note.noteUpdated;
          this.inProgress.note = false;
        },
        (error) => {
          this.inProgress.note = false;
          console.log('error: ', error);
          if (error && error.error && error.error.error) {
            const errorMessage = this.translate.instant('common.update-error', {
              error: error.error.error,
            });
            this.actionResult(errorMessage);
          }
        },
      );
  }

  private async actionResult(resultMessage: string, refresh: boolean = false) {
    const alert = await this.alertController.create({
      backdropDismiss: false,
      message: resultMessage,
      buttons: [
        {
          text: this.translate.instant('common.ok'),
          handler: () => {
            alert.dismiss(true);
            if (refresh) {
              this.pubSub.publish(PubSubEvent.dataRegistrationChanged);
            }
            return false;
          },
        },
      ],
    });

    await alert.present();
  }

  public closeModal() {
    this.modalController.dismiss();
  }

  private getFspList() {
    if (!this.programId) {
      return;
    }

    this.fspList = [];

    this.programsService.getProgramById(this.programId).then((program) => {
      if (!program || !program.financialServiceProviders) {
        return;
      }

      this.programFspLength = program.financialServiceProviders.length;
      program.financialServiceProviders.forEach((fsp) => {
        this.programsService.getFspById(fsp.id).then((fspItem) => {
          if (fspItem.fsp === this.person.fsp) {
            this.personFsp = fspItem;
          }
          this.fspList.push(fspItem);
        });
      });
    });
  }
}
