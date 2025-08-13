import { Component, EventEmitter, Output } from '@angular/core';

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
}
