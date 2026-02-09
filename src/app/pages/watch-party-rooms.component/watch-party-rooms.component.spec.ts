import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WatchPartyRoomsComponent } from './watch-party-rooms.component';

describe('WatchPartyRoomsComponent', () => {
  let component: WatchPartyRoomsComponent;
  let fixture: ComponentFixture<WatchPartyRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchPartyRoomsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WatchPartyRoomsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
