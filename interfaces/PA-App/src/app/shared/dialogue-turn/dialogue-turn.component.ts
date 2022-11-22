import {
  Component,
  Input,
  OnInit,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import { InstanceService } from 'src/app/services/instance.service';
import { environment } from 'src/environments/environment';

enum Actor {
  system = 'system',
  self = 'self',
}

@Component({
  selector: 'dialogue-turn',
  templateUrl: './dialogue-turn.component.html',
  styleUrls: ['./dialogue-turn.component.scss'],
  encapsulation: ViewEncapsulation.None, // Disabled to use the 'host-context'-level for `[dir='rtl']`-selector
})
export class DialogueTurnComponent implements OnInit {
  @Input()
  isSpoken = false;

  @Input()
  actor: Actor | string = Actor.system;

  @Input()
  actorName: string;

  @Input()
  avatarUrl: string;

  @Input()
  moment: Date;

  @Input()
  isConnected = false;

  @Input()
  animate = environment.useAnimation;

  isSelf: boolean;
  isSystem: boolean;

  constructor(@Optional() private instanceService: InstanceService) {}

  ngOnInit() {
    this.moment = new Date();
    this.isSelf = this.actor === Actor.self;
    this.isSystem = this.actor === Actor.system;
    this.getInstanceInformation();
  }

  private getInstanceInformation(): void {
    if (!this.instanceService) {
      return;
    }
    this.instanceService.instanceInformation.subscribe(
      (instanceInformation) => {
        this.updateActor(
          instanceInformation.name,
          instanceInformation.displayName,
          instanceInformation.logoUrl,
        );
      },
    );
  }

  private updateActor(
    newActor: Actor | string,
    actorName?: string,
    avatarUrl?: string,
  ): void {
    if (this.actor === Actor.system) {
      this.actor = newActor;
      this.actorName = actorName;
      this.avatarUrl = avatarUrl;
    }
  }

  public show(): void {
    this.isSpoken = true;
  }
}
