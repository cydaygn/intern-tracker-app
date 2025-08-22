import { Component, EventEmitter, Output } from '@angular/core';
import { Window } from '@tauri-apps/api/window';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Output() linkClicked = new EventEmitter<void>();

  onLinkClick() {
    this.linkClicked.emit();
  }
  
  async exitApp() {
    const currentWindow = Window.getCurrent();
    await currentWindow.close();
  }
}
