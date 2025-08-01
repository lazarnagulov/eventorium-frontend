import { Component, ChangeDetectorRef, NgZone, OnInit } from '@angular/core';
import {WebSocketService} from './web-socket/web-socket-service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isLoggedIn: boolean = false;
  drawer: boolean = false;

  constructor(
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
  }

  checkLoginStatus(): void {
    const currentUser = localStorage.getItem('user');
    this.isLoggedIn = currentUser !== null;

    if(this.isLoggedIn) {
      this.webSocketService.openSocket();
    }
  }
}
