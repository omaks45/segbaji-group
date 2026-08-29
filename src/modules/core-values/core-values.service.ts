import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertExactIdSet } from '../../common/ordering/assert-exact-id-set.util';
import { CreateCoreValueDto } from './dto/create-core-value.dto';
import { UpdateCoreValueDto } from './dto/update-core-value.dto';
import { ReorderCoreValuesDto } from './dto/reorder-core-values.dto';

@Injectable()
export class CoreValuesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coreValue.findMany({ orderBy: { order: 'asc' } });
  }

  async create(dto: CreateCoreValueDto) {
    const maxOrder = await this.prisma.coreValue.aggregate({ _max: { order: true } });
    return this.prisma.coreValue.create({
      data: { ...dto, order: (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async update(id: string, dto: UpdateCoreValueDto) {
    await this.findOneOrThrow(id);
    return this.prisma.coreValue.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrThrow(id);
    await this.prisma.coreValue.delete({ where: { id } });
    return { message: 'Core value deleted' };
  }

  async reorder(dto: ReorderCoreValuesDto) {
    const existing = await this.prisma.coreValue.findMany({ select: { id: true } });
    assertExactIdSet(existing.map((v) => v.id), dto.coreValueIds, 'coreValueIds');

    await this.prisma.$transaction(
      dto.coreValueIds.map((id, index) =>
        this.prisma.coreValue.update({ where: { id }, data: { order: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  private async findOneOrThrow(id: string) {
    const value = await this.prisma.coreValue.findUnique({ where: { id } });
    if (!value) throw new NotFoundException('Core value not found');
    return value;
  }
}