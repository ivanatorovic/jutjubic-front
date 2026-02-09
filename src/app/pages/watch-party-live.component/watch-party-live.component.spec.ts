import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WatchPartyLiveComponent } from './watch-party-live.component';

describe('WatchPartyLiveComponent', () => {
  let component: WatchPartyLiveComponent;
  let fixture: ComponentFixture<WatchPartyLiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchPartyLiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WatchPartyLiveComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
