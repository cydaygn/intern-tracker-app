import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Language } from '../models/language';

@Injectable({
    providedIn: 'root', 
  })
export class DataService {
    private _language: BehaviorSubject<Language> = new BehaviorSubject<Language>(Language.Undefined);

  constructor(private _translate: TranslateService) {
    if (localStorage.getItem('lang') === 'tr') {
      this.setLanguage(Language.Turkish);
    } else {
      this.setLanguage(Language.English);
    }
  }

  getLanguage() {
    return this._language.asObservable();
  }

  setLanguage(lang: Language) {
    this._language.next(lang);
    let langStr = lang === Language.Turkish ? 'tr' : 'en';
    localStorage.setItem('lang', langStr);
    this._translate.use(langStr);
  }
}
