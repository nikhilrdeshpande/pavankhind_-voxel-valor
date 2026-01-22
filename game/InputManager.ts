
import * as THREE from 'three';

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseButtons: Record<number, boolean> = {};
  public mouseDelta = new THREE.Vector2();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('blur', this.resetInput.bind(this));
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  private resetInput() {
    this.keys = {};
    this.mouseButtons = {};
    this.mouseDelta.set(0, 0);
  }

  private onKeyDown(e: KeyboardEvent) { this.keys[e.key.toLowerCase()] = true; }
  private onKeyUp(e: KeyboardEvent) { this.keys[e.key.toLowerCase()] = false; }
  private onMouseDown(e: MouseEvent) { this.mouseButtons[e.button] = true; }
  private onMouseUp(e: MouseEvent) { this.mouseButtons[e.button] = false; }
  private onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement) {
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
    }
  }

  public lockPointer(element: HTMLElement) {
    element.addEventListener('mousedown', () => {
      if (!document.pointerLockElement) {
          element.requestPointerLock();
      }
    });
  }

  public dispose() {
    // Ideally remove listeners
  }
}
