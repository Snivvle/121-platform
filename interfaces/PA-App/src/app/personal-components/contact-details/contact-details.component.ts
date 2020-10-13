import { Component, Input, ViewEncapsulation } from '@angular/core';
import { PersonalComponent } from 'src/app/personal-components/personal-component.class';
import { PersonalComponents } from 'src/app/personal-components/personal-components.enum';
import { ConversationService } from 'src/app/services/conversation.service';
import { PaDataService } from 'src/app/services/padata.service';
import { TranslatableStringService } from 'src/app/services/translatable-string.service';

@Component({
  selector: 'app-contact-details',
  templateUrl: './contact-details.component.html',
  styleUrls: ['./contact-details.component.scss'],
  encapsulation: ViewEncapsulation.None, // Disabled because we need to style inserted HTML from the database
})
export class ContactDetailsComponent extends PersonalComponent {
  @Input()
  public data: any;

  public contactDetails: string;

  public isCanceled = false;

  constructor(
    public conversationService: ConversationService,
    private paData: PaDataService,
    private translatableString: TranslatableStringService,
  ) {
    super();
  }

  async ngOnInit() {
    if (this.data) {
      this.initHistory();
    }

    await this.getProgramDetails();
    this.complete();
  }

  initHistory() {
    this.isDisabled = true;
    this.isCanceled = this.data.isCanceled;
  }

  private async getProgramDetails() {
    const programDetails = await this.paData.getCurrentProgram();

    if (!programDetails.contactDetails) {
      this.isCanceled = true;
      return;
    }

    this.contactDetails = this.translatableString.get(
      programDetails.contactDetails,
    );
  }

  getNextSection() {
    return PersonalComponents.consentQuestion;
  }

  complete() {
    if (this.isDisabled) {
      return;
    }

    this.isDisabled = true;
    this.conversationService.onSectionCompleted({
      name: PersonalComponents.contactDetails,
      data: {
        isCanceled: this.isCanceled,
      },
      next: this.getNextSection(),
    });
  }
}
