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
import { SubCategoriesService } from './sub-categories.service';
import {
  CreateSubCategoryDto,
  IdParamDto,
  SubCategoryListQueryDto,
  SubCategoryOptionsQueryDto,
  UpdateSubCategoryDto,
} from './dto/sub-category.dto';

@Controller('sub-categories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Roles('ADMIN')
  @Get()
  list(@Query() query: SubCategoryListQueryDto) {
    return this.subCategoriesService.list(query);
  }

  @Get('options')
  options(@Query() query: SubCategoryOptionsQueryDto) {
    return this.subCategoriesService.options(query.categoryId);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateSubCategoryDto) {
    return this.subCategoriesService.create(body);
  }

  @Roles('ADMIN')
  @Get(':id')
  getById(@Param() params: IdParamDto) {
    return this.subCategoriesService.getById(params.id);
  }

  @Roles('ADMIN')
  @Put(':id')
  update(@Param() params: IdParamDto, @Body() body: UpdateSubCategoryDto) {
    return this.subCategoriesService.update(params.id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.subCategoriesService.remove(params.id);
  }
}
