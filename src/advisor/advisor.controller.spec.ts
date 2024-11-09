import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorController } from './advisor.controller';

describe('AdvisorController', () => {
  let controller: AdvisorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorController],
    }).compile();

    controller = module.get<AdvisorController>(AdvisorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
