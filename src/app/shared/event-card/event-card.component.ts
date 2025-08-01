import {Component, Input, OnInit} from '@angular/core';
import { EventSummary } from '../../event/model/event-summary.model';
import {EventTypeService} from '../../event-type/event-type.service';
import {ActivatedRoute} from '@angular/router';
import {BudgetDialogComponent} from '../../budget/budget-dialog/budget-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {BudgetService} from '../../budget/budget.service';
import {BudgetItem} from '../../budget/model/budget-item.model';

@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.css'
})
export class EventCardComponent implements OnInit {
  @Input() event: EventSummary;
  @Input() showActions: boolean;

  items: BudgetItem[];

  constructor(
    private eventTypeService: EventTypeService,
    private currentRoute: ActivatedRoute,
    private budgetService: BudgetService,
    private dialog: MatDialog
  ) {
  }

  get route(): string {
    return this.currentRoute.snapshot.url.join('/');
  }

  ngOnInit(): void {
    this.eventTypeService.getImage(this.event.imageId).subscribe({
      next: (blob: Blob) => {
        this.event.image = URL.createObjectURL(blob);
      },
      error: (_) => {
        this.event.image = "/photo_placeholder.png";
      }
    });
  }

  openBudgetDialog(): void {
    this.budgetService.getBudgetItems(this.event.id).subscribe({
      next: (budgetItems: BudgetItem[]) => {
        this.items = budgetItems;
        this.openDialog();
      }
    });
  }

  private openDialog(): void {
    this.dialog.open(BudgetDialogComponent, {
      maxWidth: '100vw',
      minHeight: '10rem',
      data: {
        budgetItems:  this.items,
        eventId: this.event.id,
      }
    });
  }
}
