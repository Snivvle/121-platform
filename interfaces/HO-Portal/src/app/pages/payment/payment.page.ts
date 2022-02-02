import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Permission from 'src/app/auth/permission.enum';
import { ProgramPhase } from 'src/app/models/program.model';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  public Permission = Permission;

  public programId = this.route.snapshot.params.id;
  public thisPhase = ProgramPhase.payment;
  public isReady: boolean;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {}

  public onReady(state: boolean) {
    this.isReady = state;
  }
}
