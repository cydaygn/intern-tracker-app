import { Component, OnInit } from '@angular/core';   
import { ReminderService } from './services/notification';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'intern-tracker-application';

  constructor(private reminders: ReminderService, private translate: TranslateService) {
    const savedRaw = localStorage.getItem('lang') || 'tr';
    const normalized = savedRaw.split('-')[0]; // 'tr-TR' -> 'tr'
    translate.addLangs(['tr', 'en']);
    translate.setDefaultLang('tr');
    translate.use(normalized);
    document.documentElement.lang = normalized;
  }

  ngOnInit(): void {
    this.reminders.start(60); 
  }
}
