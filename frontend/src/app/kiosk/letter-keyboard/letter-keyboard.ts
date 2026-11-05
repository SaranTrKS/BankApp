import { Component, output } from '@angular/core';

const BACKSPACE = '⌫';

/**
 * Applies one keyboard key to a name. The parent keeps the value in its own signal and
 * calls this on every key, so fast taps never work from a stale value.
 */
export function applyLetterKey(current: string, key: string, maxLength: number): string {
  if (key === BACKSPACE) return current.slice(0, -1);
  if (current.length >= maxLength) return current;
  // No double spaces / leading space.
  if (key === ' ' && (current === '' || current.endsWith(' '))) return current;
  // Title-case: capital at the start of each word, lower case after.
  const startOfWord = current === '' || current.endsWith(' ') || current.endsWith('.');
  return current + (startOfWord ? key : key.toLowerCase());
}

/** On-screen A–Z keyboard for typing a name on a touch-only kiosk. Emits the key that was pressed. */
@Component({
  selector: 'app-letter-keyboard',
  standalone: true,
  template: `
    <div class="keyboard">
      @for (row of rows; track $index) {
        <div class="row">
          @for (key of row; track key) {
            <button type="button" class="key" (click)="keyPress.emit(key)">{{ key }}</button>
          }
        </div>
      }
      <div class="row">
        <button type="button" class="key key--wide" (click)="keyPress.emit('.')">.</button>
        <button type="button" class="key key--space" (click)="keyPress.emit(' ')">Space</button>
        <button type="button" class="key key--wide key--muted" (click)="keyPress.emit(backspace)">⌫</button>
      </div>
    </div>
  `,
  styles: [
    `
      .keyboard {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .row {
        display: flex;
        justify-content: center;
        gap: 8px;
      }
      .key {
        flex: 0 0 76px;
        height: 76px;
        font-size: 1.7rem;
        font-weight: 600;
        color: #f1fff4;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        font-family: inherit;
        cursor: pointer;
        transition: transform 0.08s ease, background 0.15s ease;
      }
      .key:active {
        transform: scale(0.92);
        background: rgba(105, 240, 174, 0.28);
      }
      .key--wide {
        flex-basis: 130px;
      }
      .key--space {
        flex: 1 1 auto;
        max-width: 420px;
        font-size: 1.3rem;
      }
      .key--muted {
        color: #9fe8bf;
      }
    `,
  ],
})
export class LetterKeyboard {
  keyPress = output<string>();

  readonly backspace = BACKSPACE;
  readonly rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((r) => r.split(''));
}
