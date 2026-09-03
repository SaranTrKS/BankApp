import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { formatInr, formatTenure } from '../calculators';
import { GrowthPoint } from '../models';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-line',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [
    `
      :host {
        display: block;
        height: 180px;
      }
      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    `,
  ],
})
export class ChartLine implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: GrowthPoint[] = [];
  @Input() color = '#1b5e20';

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.points.map((p) => formatTenure(p.days)),
        datasets: [
          {
            data: this.points.map((p) => p.value),
            borderColor: this.color,
            backgroundColor: this.hexToRgba(this.color, 0.15),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => formatInr(ctx.parsed.y as number),
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { display: false } },
          y: {
            ticks: {
              font: { size: 10 },
              callback: (value) => formatInr(value as number),
            },
          },
        },
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['points']) {
      this.chart.data.labels = this.points.map((p) => formatTenure(p.days));
      this.chart.data.datasets[0].data = this.points.map((p) => p.value);
      this.chart.update();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
