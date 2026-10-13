import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import {
  CategoryListQueryDto,
  CreateCategoryDto,
  IdParamDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles('ADMIN')
  @Get()
  list(@Query() query: CategoryListQueryDto) {
    return this.categoriesService.list(query);
  }

  @Get('options')
  options() {
    return this.categoriesService.options();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Roles('ADMIN')
  @Get(':id')
  getById(@Param() params: IdParamDto) {
    return this.categoriesService.getById(params.id);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(@Param() params: IdParamDto, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(params.id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.categoriesService.remove(params.id);
  }
}
