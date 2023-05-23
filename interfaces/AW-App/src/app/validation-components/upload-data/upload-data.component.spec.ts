import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { StorageService } from '../../services/storage.service';
import { UploadDataComponent } from './upload-data.component';

const mockValidationData = [{ referenceId: '', programId: 1, attributes: [] }];
const storageIonicMock: any = {
  get: () => new Promise<any>((resolve) => resolve(mockValidationData)),
  set: () => new Promise<any>((resolve) => resolve('')),
};

describe('UploadDataComponent', () => {
  let component: UploadDataComponent;
  let fixture: ComponentFixture<UploadDataComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [UploadDataComponent],
      imports: [TranslateModule.forRoot(), HttpClientTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: StorageService,
          useValue: storageIonicMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
