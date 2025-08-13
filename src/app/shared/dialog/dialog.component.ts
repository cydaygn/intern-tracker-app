import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'error' | 'confirm';
}

@Component({
  selector: 'app-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button *ngIf="data.type === 'confirm'" mat-button (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button mat-raised-button color="primary" (click)="onConfirm()">
        {{ data.confirmText || 'OK' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { font-size: 14px; margin-top: 10px; }
  `]
})
export class DialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
