import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { DepartmentResponseDto } from './dto/department-response.dto';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({ summary: 'List all active departments' })
  @ApiOkResponse({ type: DepartmentResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }
}