import { Component, Input, OnInit } from '@angular/core';

class TableItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-registration-page-table',
  templateUrl: './registration-page-table.component.html',
  styleUrls: ['./registration-page-table.component.css'],
})
export class RegistrationPageTableComponent implements OnInit {
  @Input()
  public itemList: TableItem[] = [];

  constructor() {}

  ngOnInit(): void {}
}
