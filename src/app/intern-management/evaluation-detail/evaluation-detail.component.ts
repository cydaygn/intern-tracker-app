import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Not {
  etiket: string;
  puan: number;
}

interface Stajyer {
  id: number;
  ad: string;
  notlar: Not[];
}

@Component({
  selector: 'app-evaluation-detail',
  templateUrl: './evaluation-detail.component.html',
  styleUrls: ['./evaluation-detail.component.scss']
})
export class EvaluationDetailComponent implements OnInit, AfterViewInit {
  stajyerId!: number;
  stajyerler: Stajyer[] = [
    {
      id: 1,
      ad: 'Ahmet Yılmaz',
      notlar: []
    },
    {
      id: 2,
      ad: 'Ayşe Demir',
      notlar: []
    }
  ];

  secilenStajyerId: number | null = null;
  secilenStajyerNotlar: Not[] = [];

 
  etikets = ['Teknik Bilgi', 'İletişim', 'Takım Çalışması', 'Sorumluluk', 'Zaman Yönetimi'];


  yeniNot: Not = { etiket: '', puan: 0 };

  @ViewChild('grafikCanvas') grafikCanvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.secilenStajyerId = Number(this.route.snapshot.paramMap.get('id')) || this.stajyerler[0].id;
    this.guncelleStajyerNotlar();
  }

  ngAfterViewInit(): void {
    this.cizGrafik();
  }

  guncelleStajyerNotlar() {
    const stajyer = this.stajyerler.find(s => s.id === this.secilenStajyerId);
    if (stajyer) {
      this.secilenStajyerNotlar = stajyer.notlar;
    } else {
      this.secilenStajyerNotlar = [];
    }
  }

  kaydet() {
    if (!this.yeniNot.etiket) {
      alert('Lütfen bir değerlendirme kriteri seçiniz.');
      return;
    }
    if (this.yeniNot.puan < 0 || this.yeniNot.puan > 100) {
      alert('Puan 0 ile 100 arasında olmalıdır.');
      return;
    }
    if (this.secilenStajyerId === null) {
      alert('Stajyer seçili değil!');
      return;
    }
    const stajyer = this.stajyerler.find(s => s.id === this.secilenStajyerId);
    if (stajyer) {
      
      const mevcutNotIndex = stajyer.notlar.findIndex(n => n.etiket === this.yeniNot.etiket);
      if (mevcutNotIndex >= 0) {
        stajyer.notlar[mevcutNotIndex].puan = this.yeniNot.puan;
      } else {
        stajyer.notlar.push({ ...this.yeniNot });
      }

      this.yeniNot = { etiket: '', puan: 0 };
      this.guncelleStajyerNotlar();
      this.cizGrafik();
    }
  }

  cizGrafik(): void {
    if (!this.grafikCanvas) return;

    const ctx = this.grafikCanvas.nativeElement;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.secilenStajyerNotlar.map(n => n.etiket),
        datasets: [{
          label: 'Puan',
          data: this.secilenStajyerNotlar.map(n => n.puan),
          backgroundColor: '#4CAF50'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }
}
