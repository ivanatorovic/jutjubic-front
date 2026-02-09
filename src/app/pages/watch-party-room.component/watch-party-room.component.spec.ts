import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WatchPartyRoomComponent } from './watch-party-room.component';

describe('WatchPartyRoomComponent', () => {
  let component: WatchPartyRoomComponent;
  let fixture: ComponentFixture<WatchPartyRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchPartyRoomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WatchPartyRoomComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
