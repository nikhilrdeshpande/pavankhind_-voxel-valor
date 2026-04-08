
import * as THREE from 'three';

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseButtons: Record<number, boolean> = {};
  public mouseDelta = new THREE.Vector2();
  private virtualMode = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundBlur: () => void;
  private boundContextMenu: (e: Event) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundBlur = this.resetInput.bind(this);
    this.boundContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('blur', this.boundBlur);
    window.addEventListener('contextmenu', this.boundContextMenu);
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

  public setKey(key: string, pressed: boolean) {
    this.keys[key.toLowerCase()] = pressed;
  }

  public setMouseButton(button: number, pressed: boolean) {
    this.mouseButtons[button] = pressed;
  }

  public addMouseDelta(x: number, y: number) {
    this.mouseDelta.x += x;
    this.mouseDelta.y += y;
  }

  public setVirtualMode(enabled: boolean) {
    this.virtualMode = enabled;
  }

  /** Returns true when input should be accepted (pointer locked on desktop, or virtual mode on mobile) */
  public isInputActive(): boolean {
    return !!document.pointerLockElement || this.virtualMode;
  }

  public clearMouseDelta() {
    this.mouseDelta.set(0, 0);
  }

  public lockPointer(element: HTMLElement) {
    element.addEventListener('mousedown', () => {
      if (!document.pointerLockElement) {
          element.requestPointerLock();
      }
    });
  }

  public dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('blur', this.boundBlur);
    window.removeEventListener('contextmenu', this.boundContextMenu);
  }
}
