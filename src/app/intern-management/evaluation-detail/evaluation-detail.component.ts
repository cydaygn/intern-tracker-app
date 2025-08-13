import {Component, ElementRef, OnInit, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService, InternOption, Evaluation,} from '../../services/database.service';
import {Chart,BarController,BarElement,CategoryScale, LinearScale,Tooltip,  Legend,} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

@Component({
  selector: 'app-evaluation-detail',
  templateUrl: './evaluation-detail.component.html',
  styleUrls: ['./evaluation-detail.component.scss'],
})
export class EvaluationDetailComponent implements OnInit, AfterViewInit {
  loading = false;

  interns: InternOption[] = [];
  secilenStajyerId: number | null = null;

  etikets = ['Teknik Bilgi', 'İletişim', 'Takım Çalışması', 'Sorumluluk', 'Zaman Yönetimi'];

  evaluations: Evaluation[] = [];

  yeniNot: { etiket: string; puan: number } = { etiket: '', puan: 0 };

  @ViewChild('grafikCanvas') grafikCanvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;

  constructor(
    private route: ActivatedRoute,
    private db: DatabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.db.ensureInitialized();
    await this.loadInterns();

    const fromRoute = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(fromRoute) && fromRoute > 0) {
      this.secilenStajyerId = fromRoute;
    } else if (this.interns.length > 0) {
      this.secilenStajyerId = this.interns[0].id;
    }

    await this.loadEvaluations();
    
    this.cizGrafik();
  }

  ngAfterViewInit(): void {
    this.cizGrafik();
  }

  private async loadInterns() {
    this.loading = true;
    try {
      const list = await this.db.getInternOptions();
      this.zone.run(() => {
        this.interns = list ?? [];
      });
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading interns:', error);
    } finally {
      this.loading = false;
    }
  }

  async onInternChange() {
    console.log('Intern changed to:', this.secilenStajyerId);
    await this.loadEvaluations();
    this.cizGrafik();
  }

  private async loadEvaluations() {
    if (this.secilenStajyerId == null) {
      this.zone.run(() => {
        this.evaluations = [];
      });
      this.cdr.detectChanges();
      return;
    }
    
    this.loading = true;
    try {
      console.log('Loading evaluations for intern:', this.secilenStajyerId);
      
     
      const internId = Number(this.secilenStajyerId);
      if (isNaN(internId) || internId <= 0) {
        console.error('Invalid intern ID:', this.secilenStajyerId);
        this.zone.run(() => {
          this.evaluations = [];
        });
        return;
      }

      const rows = await this.db.getEvaluations(internId);
      console.log('Loaded evaluations:', rows);
      
      this.zone.run(() => {
        this.evaluations = rows ?? [];
      });
      this.cdr.detectChanges(); 
    } catch (error) {
      console.error('Error loading evaluations:', error);
      this.zone.run(() => {
        this.evaluations = [];
      });
    } finally {
      this.loading = false;
    }
  }

  getScoreFor(label: string): number | null {
    const found = this.evaluations.find((e) => e.etiket === label);
    return found ? Number(found.puan) : null;
  }

  async kaydet() {
    if (!this.secilenStajyerId) { 
      alert('Lütfen bir stajyer seçiniz.'); 
      return; 
    }
    if (!this.yeniNot.etiket) { 
      alert('Lütfen bir kriter seçiniz.'); 
      return; 
    }

    const intern_id = Number(this.secilenStajyerId);
    const puan = Number(this.yeniNot.puan);
    
    if (isNaN(intern_id) || intern_id <= 0) {
      alert('Geçersiz stajyer seçimi.');
      return;
    }
    
    if (isNaN(puan) || puan < 0 || puan > 100) {
      alert('Puan 0–100 arası olmalıdır.');
      return;
    }

    try {
      console.log('Saving evaluation:', { intern_id, etiket: this.yeniNot.etiket, puan });
      await this.db.addEvaluation(intern_id, this.yeniNot.etiket, puan);

      this.yeniNot = { etiket: '', puan: 0 };

      
      await this.loadEvaluations();
      this.cizGrafik();
      
      console.log('Evaluation saved successfully');
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Değerlendirme kaydedilirken hata oluştu: ' + error);
    }
  }

  scoreValue(label: string): number {
    const v = this.getScoreFor(label);
    return Number.isFinite(v) ? Number(v) : 0;
  }

  scoreClass(label: string): 'low'|'mid'|'high' {
    const v = this.scoreValue(label);
    if (v < 40) return 'low';
    if (v < 75) return 'mid';
    return 'high';
  }

  cizGrafik(): void {
    if (!this.grafikCanvas) {
      console.log('Canvas not ready yet');
      return;
    }

    const canvas = this.grafikCanvas.nativeElement;
    const g = canvas.getContext('2d');
    if (!g) {
      console.error('Could not get canvas context');
      return;
    }

    
    const grad = g.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0,  '#4b8cff');  
    grad.addColorStop(1,  '#a9c7ff');  

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.etikets;
    const data = labels.map(l => (this.getScoreFor(l) ?? 0));

    console.log('Chart data:', { labels, data });

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Puan',
          data,
          backgroundColor: grad,
          borderColor: '#4b8cff',
          borderWidth: 1,
          borderRadius: 6,        
          hoverBackgroundColor: '#6aa3ff',
          hoverBorderColor: '#4b8cff',
          barThickness: 'flex',    
          maxBarThickness: 44
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        layout: { padding: 8 },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#1f2d3d', font: { weight: 600 } } 
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#e7eaf0' },   
            ticks: { color: '#6b7280' }  
          }
        },
        plugins: {
          legend: {
            display: false,
            labels: { color: '#1f2d3d' }
          },
          tooltip: {
            backgroundColor: 'rgba(31,45,61,0.95)', 
            titleColor: '#ffffff',
            bodyColor:  '#ffffff',
            borderColor: '#4b8cff',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        },
        animation: {
          duration: 420,
          easing: 'easeOutCubic'
        }
      }
    });
  }
}