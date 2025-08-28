import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  sidebarOpen = window.innerWidth >= 768;

  toggleSidebar() { 
    this.sidebarOpen = !this.sidebarOpen;
    
    if (this.sidebarOpen) {
      document.body.classList.add('sidenav-open');
    } else {
      document.body.classList.remove('sidenav-open');
    }
  }

  closeSidebar() {
    this.sidebarOpen = false;
    document.body.classList.remove('sidenav-open');
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
      document.body.classList.remove('sidenav-open');
    }
  }
}