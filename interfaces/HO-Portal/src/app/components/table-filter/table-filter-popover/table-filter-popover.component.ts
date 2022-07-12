import { Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import {
  TableFilterMultipleChoiceOutput,
  TableFilterMultipleChoiceProps,
  TableFilterMultipleChoiceState,
  TableFilterType,
} from 'src/app/models/table-filter.model';

@Component({
  selector: 'app-table-filter-popover',
  templateUrl: './table-filter-popover.component.html',
  styleUrls: ['./table-filter-popover.component.scss'],
})
export class TableFilterPopoverComponent implements OnInit {
  @Input()
  public type: string;

  @Input()
  public filterProps: TableFilterMultipleChoiceProps;

  public state: { [filterType: string]: TableFilterMultipleChoiceState };

  public tableFilterType = TableFilterType;

  private dataToReturn: {
    [TableFilterType.multipleChoice]: TableFilterMultipleChoiceOutput;
  };

  constructor(private popoverController: PopoverController) {}

  ngOnInit() {
    this.state = {
      [this.tableFilterType.multipleChoice]: this.getMultipleChoiceState(),
    };

    this.dataToReturn = {
      [this.tableFilterType.multipleChoice]: this.filterProps?.currentSelection,
    };
  }

  private getMultipleChoiceState(): TableFilterMultipleChoiceState {
    return {
      options: this.filterProps?.allOptions.reduce(
        (optionsObject, currentOption) => {
          return (optionsObject = {
            ...optionsObject,
            [currentOption.name]: this.filterProps?.currentSelection.includes(
              currentOption.name,
            ),
          });
        },
        {},
      ),
      selectAll:
        this.filterProps?.currentSelection.length ===
        this.filterProps?.allOptions.length
          ? true
          : false,
      totalCount: this.filterProps?.allOptions
        .map((o) => o.count)
        .reduce((sum, count) => sum + count, 0),
    };
  }

  public applyFilter() {
    this.dataToReturn[this.tableFilterType.multipleChoice] = Object.keys(
      this.state[this.tableFilterType.multipleChoice].options,
    ).filter(
      (key) =>
        this.state[this.tableFilterType.multipleChoice].options[key] === true,
    );

    this.popoverController.dismiss(this.dataToReturn[this.type], 'apply');
  }

  public cancel() {
    this.dataToReturn[this.tableFilterType.multipleChoice] =
      this.filterProps?.currentSelection;

    this.popoverController.dismiss(this.dataToReturn[this.type], 'cancel');
  }

  public onSelectAll() {
    const options = this.state[this.tableFilterType.multipleChoice].options;
    const selectAll = this.state[this.tableFilterType.multipleChoice].selectAll;

    for (const key of Object.keys(options)) {
      options[key] = selectAll;
    }
  }
}
