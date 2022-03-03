import { IContract } from "../models/contract";
import { IProcesorService, ProcessorStats } from "./processor.service.interface";

export class ProcessorServiceMock implements IProcesorService {
  constructor(private readonly stats: ProcessorStats) {
    //
  }

  process(contracts: IContract[]): Promise<ProcessorStats> {
    return Promise.resolve(this.stats);
  }
}