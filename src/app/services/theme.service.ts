import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum ThemeMode {
  DARK, LIGHT
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {

  private readonly CPROT_TIP_DARK_THEME = 'c-prot-tip-dark-theme';
  private readonly CPROT_TIP_LIGHT_THEME = 'c-prot-tip-light-theme';
  private readonly THEME_KEY = 'user-selected-theme';

  private cprotDarkThemeSelected = true;
  public theme$ = new BehaviorSubject<ThemeMode>(ThemeMode.DARK);

  constructor() {
    this.loadTheme();
  }

  public toggle() {
    this.cprotDarkThemeSelected = !this.cprotDarkThemeSelected;
    this.toggleCprotTipTheme();
    this.saveTheme();
  }

  public addCprotTipLightTheme() {
    document.body.classList.add(this.CPROT_TIP_LIGHT_THEME);
    document.body.classList.remove(this.CPROT_TIP_DARK_THEME);
    this.cprotDarkThemeSelected = false;
    this.theme$.next(ThemeMode.LIGHT);
    this.saveTheme();
  }

  public addCprotTipDarkTheme() {
    document.body.classList.add(this.CPROT_TIP_DARK_THEME);
    document.body.classList.remove(this.CPROT_TIP_LIGHT_THEME);
    this.cprotDarkThemeSelected = true;
    this.theme$.next(ThemeMode.DARK);
    this.saveTheme();
  }

  private toggleCprotTipTheme() {
    if (this.cprotDarkThemeSelected) {
      this.addCprotTipDarkTheme();
    } else {
      this.addCprotTipLightTheme();
    }
  }

  private saveTheme() {
    const theme = this.cprotDarkThemeSelected ? ThemeMode.DARK : ThemeMode.LIGHT;
    localStorage.setItem(this.THEME_KEY, theme.toString());
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme) {
      if (+savedTheme === ThemeMode.DARK) {
        this.addCprotTipDarkTheme();
      } else {
        this.addCprotTipLightTheme();
      }
    } else {
      // Eğer bir tema kaydı yoksa, default temayı kullan
      this.addCprotTipDarkTheme();
    }
  }

  getTheme() {
    return this.theme$;
  }
}
