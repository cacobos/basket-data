"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const analysis_controller_1 = require("./analysis.controller");
const analysis_service_1 = require("./analysis.service");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const feb_controller_1 = require("./feb.controller");
const feb_service_1 = require("./feb.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [app_controller_1.AppController, feb_controller_1.FebController, analysis_controller_1.AnalysisController],
        providers: [app_service_1.AppService, feb_service_1.FebService, analysis_service_1.AnalysisService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map