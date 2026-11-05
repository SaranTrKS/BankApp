import { Component, output } from '@angular/core';

/**
 * Applies one number-pad key to a digit string. The parent keeps the value in its own
 * signal and calls this on every key, so fast taps never work from a stale value.
 */
export function applyPadKey(current: string, key: string, maxLength: number): string {
  if (key === 'C') return '';
  if (key === '⌫') return current.slice(0, -1);
  if (current.length >= maxLength) return current;
  // No leading zeros.
  return current === '0' ? key : current + key;
}

/** Big on-screen digit pad — kiosks usually have no keyboard. Emits the key that was pressed. */
@Component({
  selector: 'app-number-pad',
  standalone: true,
  template: `
    <div class="pad">
      @for (key of keys; track key) {
        <button type="button" class="key" [class.key--muted]="key === '⌫' || key === 'C'" (click)="keyPress.emit(key)">
          {{ key }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .pad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }
      .key {
        height: 92px;
        font-size: 2.4rem;
        font-weight: 600;
        color: #f1fff4;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 22px;
        font-family: inherit;
        cursor: pointer;
        transition: transform 0.08s ease, background 0.15s ease;
      }
      .key:active {
        transform: scale(0.94);
        background: rgba(105, 240, 174, 0.28);
      }
      .key--muted {
        color: #9fe8bf;
        font-size: 2rem;
      }
    `,
  ],
})
export class NumberPad {
  keyPress = output<string>();

  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
}
