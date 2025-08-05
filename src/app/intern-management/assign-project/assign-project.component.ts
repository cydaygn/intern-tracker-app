import { Component } from '@angular/core';

interface Intern {
  id: number;
  name: string;
}

@Component({
  selector: 'app-assign-project',
  templateUrl: './assign-project.component.html',
  styleUrls: ['./assign-project.component.scss']
})
export class AssignProjectComponent {
  interns: Intern[] = [
    { id: 1, name: 'Ali Veli' },
    { id: 2, name: 'Ayşe Yılmaz' },
    { id: 3, name: 'Mehmet Demir' }
  ];

  projectTypes: string[] = [
    'Web Geliştirme',
    'Mobil Uygulama',
    'Veri Analizi',
    'Yapay Zeka',
    'Diğer'
  ];

  selectedInternId: number | null = null;
  selectedProjectType: string | null = null;
  taskDescription: string = '';
  dueDate: string = '';
  status: string = 'Planned'; 
pdfDosyasi: File | null = null;

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.pdfDosyasi = input.files[0];
    console.log("Seçilen PDF dosyası:", this.pdfDosyasi.name);
  }
}

  todayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ata() {
    if (
      !this.selectedInternId ||
      !this.selectedProjectType ||
      !this.taskDescription.trim() ||
      !this.dueDate
    ) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    const assignedProject = {
      internId: this.selectedInternId,
      projectType: this.selectedProjectType,
      taskDescription: this.taskDescription.trim(),
      dueDate: this.dueDate,
      status: this.status
    };

    console.log('Proje atandı:', assignedProject);
    alert('Proje başarıyla atandı!');

    // Formu temizle
    this.cancelAssign();
  }

  cancelAssign() {
    this.selectedInternId = null;
    this.selectedProjectType = null;
    this.taskDescription = '';
    this.dueDate = '';
    this.status = 'Planned';
  }
}
