import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { formatInr, StageBreakdown } from '../calculators';

Chart.register(...registerables);

@Component({
  selector: 'app-stage-bar-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [
    `
      :host {
        display: block;
        height: 220px;
      }
      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    `,
  ],
})
export class StageBarChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() stages: StageBreakdown[] = [];
  /** Light text/grid for dark backgrounds (the kiosk). */
  @Input() dark = false;

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.stages.map((s) => s.label),
        datasets: [
          {
            label: 'Investment',
            data: this.stages.map((s) => s.investment),
            backgroundColor: this.dark ? 'rgba(165, 214, 167, 0.55)' : '#a5d6a7',
          },
          {
            label: 'Maturity',
            data: this.stages.map((s) => s.maturity),
            backgroundColor: this.dark ? '#69f0ae' : '#1b5e20',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: this.dark ? 16 : 10 }, color: this.dark ? '#e8f5e9' : undefined } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatInr(ctx.parsed.y as number)}`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: this.dark ? 15 : 10 }, color: this.dark ? '#b9d7bd' : undefined }, grid: { display: false } },
          y: {
            grid: { color: this.dark ? 'rgba(255, 255, 255, 0.08)' : undefined },
            ticks: {
              color: this.dark ? '#b9d7bd' : undefined,
              font: { size: this.dark ? 15 : 10 },
              callback: (value) => formatInr(value as number),
            },
          },
        },
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['stages']) {
      this.chart.data.labels = this.stages.map((s) => s.label);
      this.chart.data.datasets[0].data = this.stages.map((s) => s.investment);
      this.chart.data.datasets[1].data = this.stages.map((s) => s.maturity);
      this.chart.update();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
