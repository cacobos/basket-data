import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { CoreModule } from './core/core.module'; // Import CoreModule

@Component({
  selector: 'app-root',
  standalone: true, // Make AppComponent standalone
  imports: [
    CoreModule, // CoreModule exports LayoutComponent which uses MatToolbarModule etc.
    RouterModule // Needed if router-outlet is used by components imported here, which it is.
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'] // Changed from styleUrl to styleUrls
})
export class App { // Renamed class from App to AppComponent for convention, if desired
  protected title = 'basket-data-ui';
}
