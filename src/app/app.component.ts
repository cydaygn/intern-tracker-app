import { Component, OnInit } from '@angular/core';   
import { ReminderService } from './services/notification';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'intern-tracker-application';

  constructor(private reminders: ReminderService) {}

  ngOnInit(): void {
    this.reminders.start(60); 
  }
}
