import {Component, Input, OnInit} from '@angular/core';
import {Product} from '../model/product.model';
import {ActivatedRoute, Router} from '@angular/router';
import {ImageResponseDto} from '../../shared/model/image-response-dto.model';
import {ProductService} from '../product.service';
import {forkJoin, switchMap} from 'rxjs';
import {AuthService} from '../../auth/auth.service';
import {BudgetService} from '../../budget/budget.service';
import {Event} from '../../event/model/event.model';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {EventSelectionComponent} from '../../shared/event-selection/event-selection.component';
import {ToastrService} from 'ngx-toastr';
import {HttpErrorResponse} from '@angular/common/http';
import {ChatDialogService} from '../../shared/chat-dialog/chat-dialog.service';
import {UserDetails} from '../../user/model/user-details.model';
import {CommentsDialogComponent} from '../../review/comments-dialog/comments-dialog.component';
import {ReviewType} from '../../review/model/review-type.enum';
import {SolutionType} from '../../budget/model/solution-type.enum';
import {BudgetItem} from '../../budget/model/budget-item.model';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {
  @Input() product: Product;
  isFavorite: boolean;

  eventId: number;
  plannedAmount: number;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private budgetService: BudgetService,
    private authService: AuthService,
    private toasterService: ToastrService,
    private dialog: MatDialog,
    private router: Router,
    private chatService: ChatDialogService ) { }

  ngOnInit(): void {
    this.route.params.subscribe(param => {
      this.loadProduct(+param['id']);
    });
    this.route.queryParams.subscribe(param => {
      if(param['eventId']) {
        this.eventId = +param['eventId'];
        this.plannedAmount = +param['plannedAmount'];
      }
    });
  }

  get isProvider(): boolean {
    return (this.authService.getUserId() == this.product?.provider?.id);
  }

  toggleFavouriteProduct(): void {
    if(this.isFavorite) {
      this.productService.removeFromFavourites(this.product.id).subscribe({
        next: () => {
          this.toasterService.info(`Removed ${this.product.name} from favourite products`, "Favourite products");
          this.isFavorite = false;
        }
      });
    } else {
      this.productService.addToFavourites(this.product.id).subscribe({
        next: () => {
          this.toasterService.success(`Added ${this.product.name} to favourite products`, "Favourite products");
          this.isFavorite = true;
        }
      });
    }
  }

  onPurchase(): void {
    if (this.eventId && this.plannedAmount)
      this.purchaseProduct(this.eventId, this.plannedAmount)
    else
      this.draftedPurchase();
  }

  openChatDialog (recipient?: UserDetails): void {
    this.chatService.openChatDialog(recipient || this.product.provider);
  }

   openSeeCommentsDialog(): void {
    this.dialog.open(CommentsDialogComponent, {  width: '450px', height: 'auto',
        data: {
          objectId: this.product?.id,
          reviewType: ReviewType.PRODUCT
        }
    });
  }

  getRole(): string { return this.authService.getRole(); }

  private draftedPurchase(): void {
    const dialogRef = this.dialog.open(EventSelectionComponent, {
      width: '450px',
      height: 'auto',
      disableClose: true,
      panelClass: 'custom-dialog-container',
      data: { type: SolutionType.PRODUCT }
    });
    this.handleCloseDialog(dialogRef);
  }

  private handleCloseDialog(dialogRef: MatDialogRef<EventSelectionComponent>): void {
    dialogRef
      .afterClosed()
      .subscribe(({ addToPlanner, plannedAmount, event }: { addToPlanner: boolean, plannedAmount: number, event: Event }) => {
        if(addToPlanner) {
          this.createBudgetItem(event.id, plannedAmount);
        } else this.purchaseProduct(event.id, plannedAmount);
      });
  }

  private loadProduct(id: number): void {
    this.productService.get(id).pipe(
      switchMap((product: Product) => {
        if (this.getRole()) {
          return forkJoin([
            this.productService.get(id),
            this.productService.getImages(product.id),
            this.productService.getIsFavourite(product.id)
          ]);
        } else {
          return forkJoin([
            this.productService.get(id),
            this.productService.getImages(product.id),
          ]);
        }
      })
    ).subscribe({
      next: ([product, images, isFavourite]: [Product, ImageResponseDto[], boolean?]) => {
        this.product = product;
        if(this.getRole) {
          this.isFavorite = isFavourite;
        }
        this.product.images = images.map(image =>
          `data:${image.contentType};base64,${image.data}`
        );
      },
      error: (error) => this.handleError(error)
    });
  }

  private handleError(error: HttpErrorResponse): void {
    void this.router.navigate(['/error'], { queryParams: {
      code: error.status,
      message: error.error?.message || 'An unknown error occurred.'
    }});
  }

  private purchaseProduct(eventId: number, plannedAmount: number): void {
    this.budgetService.purchase(eventId, {
      category: this.product.category,
      itemId: this.product.id,
      plannedAmount: plannedAmount,
      itemType: SolutionType.PRODUCT,
    }).subscribe({
      next: () => {
        this.toasterService.success("Successfully purchased product!", "Success");
        if(this.plannedAmount && this.eventId)
          this.navigateBackToPlanner()
      },
      error: (error: HttpErrorResponse) => {
        this.toasterService.error(error.error.message, "Failed to purchase product");
      }
    });
  }

  createBudgetItem(eventId: number, plannedAmount: number): void {
    if(plannedAmount < this.product.price * (1 - this.product.discount / 100)) {
      this.toasterService.error("Planned amount should be larger then price", "Error");
      return;
    }

    this.budgetService.createBudgetItem(eventId, {
      category: this.product.category,
      itemId: this.product.id,
      itemType: SolutionType.PRODUCT,
      plannedAmount: plannedAmount
    }).subscribe({
      next: (item: BudgetItem) => {
        this.toasterService.success(`'${item.solutionName}' has been added to planner successfully`, "Success");
        if(this.eventId && this.plannedAmount)
          this.navigateBackToPlanner();
      },
      error: (error: HttpErrorResponse) => {
        this.toasterService.error(error.error.message, "Failed to add to budget planner");
      }
    });
  }

  navigateBackToPlanner(): void {
    void this.router.navigate(['budget-planning', this.eventId]);
  }
}
