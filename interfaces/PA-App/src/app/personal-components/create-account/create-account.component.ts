import { Component, Input } from '@angular/core';
import {
  LoggingEvent,
  LoggingEventCategory,
} from 'src/app/models/logging-event.enum';
import { PersonalDirective } from 'src/app/personal-components/personal-component.class';
import { PersonalComponents } from 'src/app/personal-components/personal-components.enum';
import { ConversationService } from 'src/app/services/conversation.service';
import { LoggingService } from 'src/app/services/logging.service';
import { PaDataService } from 'src/app/services/padata.service';
import { ProgramsServiceApiService } from 'src/app/services/programs-service-api.service';

@Component({
  selector: 'app-create-account',
  templateUrl: './create-account.component.html',
  styleUrls: ['./create-account.component.scss'],
})
export class CreateAccountComponent extends PersonalDirective {
  @Input()
  public data: any;

  public passwordMinLength = 4;

  public initialInput = false;
  public usernameSubmitted = false;
  public username: string;
  public create: string;
  public confirm: string;
  public unequalPasswords = false;
  public usernameNotUnique = false;

  public isInProgress = false;
  public createIsValid: boolean;

  constructor(
    public conversationService: ConversationService,
    public programsServiceApiService: ProgramsServiceApiService,
    public paData: PaDataService,
    private logger: LoggingService,
  ) {
    super();
  }

  ngOnInit() {
    if (this.data) {
      this.initHistory();
    }
  }

  initHistory() {
    this.isDisabled = true;
    this.username = this.data.username;
    this.create = this.data.password;
    this.confirm = this.data.password;
    this.usernameSubmitted = true;
    this.initialInput = true;
  }

  public async submitCredentials(
    username: string,
    create: string,
    confirm: string,
  ) {
    console.log('submitCredentials()', username, create, confirm);

    // Reset server-side errors, to be sure to only show the first, most relevant error only.
    this.usernameNotUnique = false;
    this.unequalPasswords = false;

    if (!username) {
      this.usernameSubmitted = false;
      this.isInProgress = false;
      console.log('No username. ⛔️');
      return;
    }

    this.usernameSubmitted = true;

    if (!create && !confirm) {
      this.isInProgress = false;
      console.log('Username ✅; But no passwords. ⛔️');
      return;
    }

    if (create && !this.createIsValid) {
      this.initialInput = false;
      this.isInProgress = false;
      console.log('Username ✅; First password = Validation error. ⛔️');

      this.logger.logEvent(
        LoggingEventCategory.input,
        LoggingEvent.passwordNotValid,
      );

      return;
    }

    if (create && this.createIsValid && !confirm) {
      this.initialInput = true;
      this.isInProgress = false;
      console.log('Username ✅; First password ✅; No 2nd password. ⛔️');
      return;
    }

    if (create && this.createIsValid && create !== confirm) {
      this.initialInput = true;
      this.unequalPasswords = true;
      this.isInProgress = false;
      console.log(
        'Username ✅; First password ✅; 2nd password ✅; Passwords not equal. ⛔️',
      );

      this.logger.logEvent(
        LoggingEventCategory.input,
        LoggingEvent.passwordNotEqual,
      );

      return;
    }

    this.isInProgress = true;
    this.unequalPasswords = false;

    console.log(
      'Username ✅; First password ✅; 2nd password ✅; Passwords equal ✅; Done! ✅',
    );

    // Create PA-account using supplied password + username
    this.conversationService.startLoading();
    await this.paData.createAccount(username, create).then(
      async (response) => {
        console.log('createAccount', response);
        await this.createRegistration();
        this.usernameNotUnique = false;
        this.conversationService.stopLoading();
        this.complete();
        this.logger.logEvent(
          LoggingEventCategory.ui,
          LoggingEvent.accountCreated,
        );
      },
      (error) => {
        this.conversationService.stopLoading();
        if (error.status === 400) {
          this.usernameNotUnique = true;
          this.isInProgress = false;
          this.logger.logEvent(
            LoggingEventCategory.input,
            LoggingEvent.usernameNotUnique,
          );
        }
        console.warn('CreateAccount Error: ', error);
      },
    );
  }

  async createRegistration() {
    const referenceId =
      this.createRandomHexaDecimalString(8) +
      '-' +
      this.createRandomHexaDecimalString(4) +
      '-' +
      this.createRandomHexaDecimalString(4) +
      '-' +
      this.createRandomHexaDecimalString(4) +
      '-' +
      this.createRandomHexaDecimalString(12);

    const currentProgram = await this.paData.getCurrentProgram();

    await this.programsServiceApiService.createRegistration(
      referenceId,
      currentProgram.id,
    );

    await this.paData.store(this.paData.type.referenceId, referenceId);
    await this.paData.store(this.paData.type.programId, currentProgram.id);
  }

  private createRandomHexaDecimalString(length: number): string {
    let result = '';
    const characters = 'abcdef0123456789';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  getNextSection() {
    return PersonalComponents.enrollInProgram;
  }

  complete() {
    this.isDisabled = true;
    this.conversationService.onSectionCompleted({
      name: PersonalComponents.createAccount,
      data: {
        username: this.username,
        password: '****************',
      },
      next: this.getNextSection(),
    });
  }
}
