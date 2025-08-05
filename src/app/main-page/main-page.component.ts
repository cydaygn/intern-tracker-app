import { Component } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';


@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent {

  testResult: string = '';

  async testRustCommunication() {
    try {
      const response = await invoke<string>('test_message');
      this.testResult = response;  
      console.log('Rust cevabı:', response);
    } catch (error) {
      console.error('Rust iletişim hatası:', error);
      this.testResult = 'Rust iletişiminde hata oluştu.';
    }
  }
}
