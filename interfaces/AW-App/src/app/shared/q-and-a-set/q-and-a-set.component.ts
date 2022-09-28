import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  Answer,
  AnswerSet,
  AnswerType,
  Question,
  QuestionOption,
} from 'src/app/models/q-and-a.models';
import { DialogueTurnComponent } from '../dialogue-turn/dialogue-turn.component';

@Component({
  selector: 'q-and-a-set',
  templateUrl: './q-and-a-set.component.html',
  styleUrls: ['./q-and-a-set.component.scss'],
})
export class QAndASetComponent implements OnChanges {
  @ViewChildren(DialogueTurnComponent)
  private turns: QueryList<DialogueTurnComponent>;

  @Input()
  public questions: Question[];

  @Input()
  public answers: AnswerSet = {};

  @Input()
  public isSubmitted = false;
  @Output()
  public isSubmittedChange = new EventEmitter<boolean>();

  @Input()
  public isEditing = false;
  @Output()
  public isEditingChange = new EventEmitter<boolean>();

  @Output()
  public submit = new EventEmitter<any>();

  @Input()
  public submitLabel = 'Submit';

  @Input()
  public allQuestionsShown: boolean;

  public answerType = AnswerType;

  public theForm: NgForm;
  public theFormModels = {};

  public validationErrors: string[] = [];

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    // Wait for questions to finish loading, to only THEN parse the provided ansers:
    if (
      changes.questions &&
      typeof changes.questions.currentValue !== 'undefined'
    ) {
      this.fillAnswerModels();
    }
  }

  private fillAnswerModels() {
    Object.values(this.answers).forEach((item) => {
      this.theFormModels[item.code] = item.value;
    });
  }

  private getQuestionByCode(questionCode: string): Question {
    const result = this.questions.find((question: Question) => {
      return question.code === questionCode;
    });

    return result;
  }

  private getAnswerOptionLabelByValue(
    options: QuestionOption[],
    answerValue: string,
  ) {
    const option = options.find((item: QuestionOption) => {
      return item.value === answerValue;
    });

    return option ? option.label : '';
  }

  private createAnswer(question: Question, answerValue: string): Answer {
    const answer: Answer = {
      code: question.code,
      value: answerValue,
      label: answerValue,
    };

    // Convert the answerValue to a human-readable label
    if (question.answerType === AnswerType.Enum) {
      answer.label = this.getAnswerOptionLabelByValue(
        question.options,
        answerValue,
      );
    }

    return answer;
  }

  public onAnswerChange(questionCode: string, answerValue: string) {
    // Remove 'false positive' change-events on load/initiation of the component with data
    if (!answerValue) {
      return;
    }
    const question = this.getQuestionByCode(questionCode);
    const answer = this.createAnswer(question, answerValue);

    // Save answer
    this.answers[questionCode] = answer;

    const answersArray = Object.keys(this.answers);

    this.allQuestionsShown = this.checkAllQuestionsShown(
      this.questions,
      answersArray,
    );
    this.showNextQuestion(answersArray.indexOf(questionCode));
  }
  public onAnswerChangeMultiSelect(
    questionCode: string,
    answerInput: { checked: boolean; value: string },
  ) {
    console.log('answerInput: ', answerInput);
    let answerStore;
    let answerValue;

    if (this.answers[questionCode] && this.answers[questionCode].value) {
      answerStore = new Set(this.answers[questionCode].value);
    } else {
      answerStore = new Set([]);
    }

    if (answerInput.checked) {
      answerStore.add(answerInput.value);
    } else {
      answerStore.delete(answerInput.value);
    }

    answerValue = Array.from(answerStore).sort();

    if (!answerValue) {
      // Reset previously stored answer(s)
      delete this.answers[questionCode];

      this.addValidationError(questionCode);
      return;
    }
    this.removeValidationError(questionCode);
    console.log('answerStore: ', answerStore);
    console.log('answerValue: ', answerValue);

    this.onAnswerChange(questionCode, answerValue);
  }

  private showNextQuestion(currentIndex: number) {
    const nextIndex = currentIndex + 1;

    this.showQuestionByIndex(nextIndex);
  }

  private showQuestionByIndex(index: number) {
    const onlyQuestionTurns = this.turns.filter(
      (turn: DialogueTurnComponent) => turn.isSelf,
    );
    const questionTurn = onlyQuestionTurns[index];

    if (questionTurn) {
      questionTurn.show();
    }
  }

  private checkAllQuestionsShown(questions: Question[], answers: string[]) {
    return answers.length === questions.length;
  }

  public onChangeWithValidation(
    questionCode: string,
    answerValue: string,
    validity: boolean,
  ) {
    if (validity !== true) {
      this.addValidationError(questionCode);
      return;
    }

    this.removeValidationError(questionCode);

    this.onAnswerChange(questionCode, answerValue);
  }

  private removeValidationError(questionCode: string): void {
    if (this.validationErrors.includes(questionCode)) {
      const itemIndex = this.validationErrors.indexOf(questionCode);
      this.validationErrors.splice(itemIndex, 1);
    }
  }

  private addValidationError(questionCode: string): void {
    if (!this.validationErrors.includes(questionCode)) {
      this.validationErrors.push(questionCode);
    }
  }

  public checkValidationError(questionCode: string): boolean {
    return this.validationErrors.includes(questionCode);
  }

  public checkValidationErrors(): boolean {
    return this.validationErrors.length > 0;
  }

  public doSubmit() {
    if (this.checkValidationErrors()) {
      return;
    }

    this.isSubmitted = true;
    this.isSubmittedChange.emit(this.isSubmitted);
    this.isEditing = false;
    this.isEditingChange.emit(this.isEditing);
    this.submit.emit(this.answers);
  }
}
