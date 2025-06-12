import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport'; // Import AuthGuard

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(AuthGuard('jwt')) // Protect with JwtAuthGuard
  @Get('profile')
  getProfile(@Req() req) {
    // req.user is populated by JwtStrategy.validate()
    return req.user;
  }
}
